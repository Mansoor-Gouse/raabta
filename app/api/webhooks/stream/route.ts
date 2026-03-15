import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getStreamServerClient } from "@/lib/stream-server";
import { sendPushToUserAsync } from "@/lib/pushSend";

const STREAM_SECRET = process.env.STREAM_SECRET || "";

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!STREAM_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", STREAM_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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
      console.warn("[webhooks/stream] Invalid or missing signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    const senderId = payload.message?.user_id ?? payload.message?.user?.id;
    if (payload.type !== "message.new" || !senderId) {
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
      return NextResponse.json({ ok: true });
    }

    const text = (payload.message?.text || "").slice(0, 80);
    const senderName = payload.message?.user?.name || "Someone";

    let memberIds: string[];
    const payloadMembers = payload.members;
    if (Array.isArray(payloadMembers) && payloadMembers.length > 0) {
      memberIds = payloadMembers
        .map((m) => m.user_id ?? m.user?.id)
        .filter((id): id is string => !!id && id !== senderId);
    } else {
      const client = getStreamServerClient();
      if (!client) {
        console.warn("[webhooks/stream] No Stream server client");
        return NextResponse.json({ ok: true });
      }
      const channel = client.channel(channelType, channelId);
      const state = await channel.query();
      const members = state.members || {};
      memberIds = Object.keys(members).filter((id) => id !== senderId);
    }

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const url = base ? `${base}/app/channel/${channelId}` : `/app/channel/${channelId}`;

    console.log("[webhooks/stream] message.new", { channelId, memberIds, senderName });
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
