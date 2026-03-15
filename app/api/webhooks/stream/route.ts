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
  message?: {
    user_id?: string;
    text?: string;
    user?: { name?: string };
  };
  channel_id?: string;
  channel_type?: string;
};

/**
 * Stream Chat webhook for message.new: send push notifications to channel members (except sender).
 * Configure in Stream Dashboard: Event Hooks → webhook_url = https://your-domain/api/webhooks/stream, event_types = ["message.new"].
 * Requires STREAM_SECRET for X-Signature verification.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    if (payload.type !== "message.new" || !payload.message?.user_id || !payload.channel_id) {
      return NextResponse.json({ ok: true });
    }

    const senderId = payload.message.user_id;
    const channelId = payload.channel_id;
    const channelType = payload.channel_type || "messaging";
    const text = (payload.message.text || "").slice(0, 80);
    const senderName = payload.message.user?.name || "Someone";

    const client = getStreamServerClient();
    if (!client) {
      return NextResponse.json({ ok: true });
    }

    const channel = client.channel(channelType, channelId);
    const state = await channel.query();
    const members = state.members || {};
    const memberIds = Object.keys(members).filter((id) => id !== senderId);

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const url = base ? `${base}/app/channel/${channelId}` : `/app/channel/${channelId}`;

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
