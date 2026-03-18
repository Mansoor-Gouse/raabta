import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getStreamServerClient } from "@/lib/stream-server";
import { sendPushToUserAsync } from "@/lib/pushSend";

const STREAM_SECRET = process.env.STREAM_SECRET || "";

function base64UrlToBuffer(input: string): Buffer | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "==".slice(0, (4 - (normalized.length % 4)) % 4);
    const base64 = normalized + padding;
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!STREAM_SECRET || !signatureHeader) return false;

  // Stream sends an HMAC-SHA256 digest; depending on config it can be encoded differently.
  // We verify candidates split by comma (multi-value header) and accept hex or base64url encodings.
  const expectedDigest = crypto.createHmac("sha256", STREAM_SECRET).update(rawBody).digest();
  const candidates = signatureHeader
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    // Hex-encoded digest
    if (/^[0-9a-fA-F]+$/.test(candidate) && candidate.length % 2 === 0) {
      const buf = Buffer.from(candidate, "hex");
      if (buf.length === expectedDigest.length && crypto.timingSafeEqual(buf, expectedDigest)) return true;
      continue;
    }

    // base64url-encoded digest
    const buf = base64UrlToBuffer(candidate);
    if (buf && buf.length === expectedDigest.length && crypto.timingSafeEqual(buf, expectedDigest)) return true;
  }

  return false;
}

type WebhookPayload = {
  type?: string;
  cid?: string;
  channel_id?: string;
  channel_type?: string;
  message?: {
    user_id?: string;
    text?: string;
    user?: { name?: string; id?: string };
  };
  members?: { user_id?: string; user?: { id?: string } }[];
};

/**
 * Stream Chat webhook for message.new: send push notifications to channel members (except sender).
 *
 * Required: In Stream Dashboard → Chat → Event Hooks (or Webhooks):
 * - Webhook URL: https://YOUR_DOMAIN/api/webhooks/stream (must be public HTTPS)
 * - Event type: message.new
 * - Signing secret: same as STREAM_SECRET in env (Stream signs payload with it; we verify X-Signature header).
 *
 * Requires STREAM_SECRET for X-Signature verification.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");
    if (!verifySignature(rawBody, signature)) {
      console.warn("[webhooks/stream] Invalid signature", {
        streamSecretConfigured: !!STREAM_SECRET,
        signaturePresent: !!signature,
        signatureLength: signature?.length ?? 0,
        signatureHasComma: signature ? signature.includes(",") : false,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    const senderIdCandidates = new Set<string>();
    if (payload.message?.user?.id) senderIdCandidates.add(payload.message.user.id);
    if (payload.message?.user_id) senderIdCandidates.add(payload.message.user_id);
    const senderId = senderIdCandidates.values().next().value;

    if (payload.type !== "message.new" || !senderId) {
      console.log("[webhooks/stream] ignoring event", {
        type: payload.type,
        senderIdPresent: !!senderId,
        hasMessage: !!payload.message,
      });
      return NextResponse.json({ ok: true });
    }

    let channelId = payload.channel_id;
    let channelType = payload.channel_type || "messaging";
    if (!channelId && payload.cid) {
      const [type, id] = payload.cid.split(":");
      if (type && id) {
        channelType = type;
        channelId = id;
      }
    }
    if (!channelId) {
      console.log("[webhooks/stream] missing channelId; skip push", {
        cid: payload.cid,
        channel_idPresent: !!payload.channel_id,
      });
      return NextResponse.json({ ok: true });
    }

    const text = (payload.message?.text || "").slice(0, 80);
    const senderName = payload.message?.user?.name || "Someone";

    let memberIds: string[];
    const payloadMembers = payload.members;
    if (Array.isArray(payloadMembers) && payloadMembers.length > 0) {
      memberIds = payloadMembers
        .map((m) => m.user?.id ?? m.user_id)
        .filter((id): id is string => !!id && !senderIdCandidates.has(id));

      // Deduplicate recipients in case Stream returns overlapping member objects.
      memberIds = Array.from(new Set(memberIds));
    } else {
      const client = getStreamServerClient();
      if (!client) {
        console.warn("[webhooks/stream] No Stream server client");
        return NextResponse.json({ ok: true });
      }
      const channel = client.channel(channelType, channelId);
      const state = await channel.query();
      const members = state.members || {};
      memberIds = Object.keys(members).filter((id) => !senderIdCandidates.has(id));
    }

    if (!memberIds.length) {
      console.log("[webhooks/stream] memberIds empty after mapping", {
        channelId,
        channelType,
        senderId,
        hadPayloadMembers: Array.isArray(payloadMembers) && payloadMembers.length > 0,
      });
    }

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const url = base ? `${base}/app/channel/${channelId}` : `/app/channel/${channelId}`;

    console.log("[webhooks/stream] message.new push dispatch", {
      channelId,
      channelType,
      recipients: memberIds.length,
      senderId,
      senderName,
      memberSample: memberIds.slice(0, 3),
    });
    for (const userId of memberIds) {
      sendPushToUserAsync(userId, {
        title: senderName,
        body: text || "New message",
        url,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhooks/stream]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
