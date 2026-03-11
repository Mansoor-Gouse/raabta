import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PushSubscriptionModel } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { endpoint, keys } = body as {
      endpoint?: string;
      keys?: { p256dh: string; auth: string };
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "endpoint and keys (p256dh, auth) required" },
        { status: 400 }
      );
    }
    await connectDB();
    await PushSubscriptionModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(session.userId), endpoint },
      {
        $set: {
          userId: new mongoose.Types.ObjectId(session.userId),
          endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
        },
      },
      { upsert: true, new: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push-subscribe", e);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint query required" },
        { status: 400 }
      );
    }
    await connectDB();
    await PushSubscriptionModel.deleteOne({
      userId: new mongoose.Types.ObjectId(session.userId),
      endpoint,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push-unsubscribe", e);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
