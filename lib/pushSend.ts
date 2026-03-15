/**
 * Send Web Push notifications to a user's subscribed devices.
 * Uses VAPID keys from env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).
 * Fire-and-forget: run async, do not delay HTTP response.
 */

import webpush from "web-push";
import mongoose from "mongoose";
import { connectDB, PushSubscriptionModel } from "@/lib/db";

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails("mailto:app@elite.events", publicKey, privateKey);
    vapidConfigured = true;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Send a push notification to all subscriptions for the given user.
 * Runs asynchronously; errors are logged. Invalid subscriptions (e.g. expired)
 * are removed on 410/404 responses.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  configureVapid();
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("[pushSend] VAPID keys not set; skip push");
    return;
  }
  try {
    await connectDB();
    let objectId: mongoose.Types.ObjectId;
    try {
      objectId = new mongoose.Types.ObjectId(userId);
    } catch {
      console.warn("[pushSend] Invalid userId for ObjectId:", userId);
      return;
    }
    const subs = await PushSubscriptionModel.find({ userId: objectId })
      .lean()
      .exec();
    const subList = subs as unknown as { _id: mongoose.Types.ObjectId; endpoint: string; keys: { p256dh: string; auth: string } }[];
    if (subList.length === 0) {
      console.log("[pushSend] No push subscriptions for user:", userId);
      return;
    }
    console.log("[pushSend] Sending to user", userId, "subscriptions:", subList.length);
    const payloadStr = JSON.stringify(payload);
    for (const sub of subList) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          payloadStr
        );
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          await PushSubscriptionModel.deleteOne({ _id: sub._id }).exec();
        }
        console.error("[pushSend] send failed for subscription", sub._id, err);
      }
    }
  } catch (err) {
    console.error("[pushSend] sendPushToUser error", userId, err);
  }
}

/**
 * Fire-and-forget: schedule sending push without awaiting.
 * Use after creating in-app notifications so the HTTP response is not delayed.
 */
export function sendPushToUserAsync(userId: string, payload: PushPayload): void {
  void sendPushToUser(userId, payload);
}
