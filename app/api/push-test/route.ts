import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendPushToUser } from "@/lib/pushSend";

/**
 * POST /api/push-test — send a test push notification to the current user.
 * Use this to verify: subscription is stored, VAPID keys work, and the service worker shows the notification.
 */
export async function POST() {
  const session = await requireAuth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await sendPushToUser(session.userId, {
      title: "Test notification",
      body: "If you see this, push is working.",
      url: "/app/chats",
    });
    return NextResponse.json({ ok: true, message: "Test push sent" });
  } catch (e) {
    console.error("[push-test]", e);
    return NextResponse.json(
      { error: "Failed to send test push" },
      { status: 500 }
    );
  }
}
