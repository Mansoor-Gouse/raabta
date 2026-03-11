import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  CircleRelationshipModel,
  NotificationModel,
  INNER_CIRCLE_MAX,
  TRUSTED_CIRCLE_MAX,
} from "@/lib/db";
import { sendPushToUserAsync } from "@/lib/pushSend";

export async function PATCH(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as {
    relatedUserId?: string;
    circleType?: string;
  };
  const { relatedUserId, circleType } = body;
  if (!relatedUserId || typeof relatedUserId !== "string") {
    return NextResponse.json({ error: "relatedUserId is required" }, { status: 400 });
  }
  if (!circleType || !["TRUSTED", "INNER"].includes(circleType)) {
    return NextResponse.json({ error: "circleType must be TRUSTED or INNER" }, { status: 400 });
  }
  if (relatedUserId === session.userId) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  let relatedOid: mongoose.Types.ObjectId;
  try {
    relatedOid = new mongoose.Types.ObjectId(relatedUserId);
  } catch {
    return NextResponse.json({ error: "Invalid relatedUserId" }, { status: 400 });
  }

  await connectDB();

  const myId = new mongoose.Types.ObjectId(session.userId);
  const existing = await CircleRelationshipModel.findOne({
    userId: myId,
    relatedUserId: relatedOid,
  }).exec();

  if (!existing) {
    return NextResponse.json({ error: "Not in your circle" }, { status: 404 });
  }

  if (existing.circleType === circleType) {
    return NextResponse.json({ ok: true, circleType });
  }

  if (circleType === "INNER") {
    const innerCount = await CircleRelationshipModel.countDocuments({
      userId: myId,
      circleType: "INNER",
    }).exec();
    if (innerCount >= INNER_CIRCLE_MAX) {
      return NextResponse.json(
        {
          error: `Inner Circle is full (${INNER_CIRCLE_MAX}). Remove someone to move this person.`,
          code: "INNER_CIRCLE_FULL",
        },
        { status: 400 }
      );
    }
  }

  existing.circleType = circleType as "TRUSTED" | "INNER";
  await existing.save();

  if (circleType === "INNER") {
    const theyHaveMeInInner = await CircleRelationshipModel.findOne({
      userId: relatedOid,
      relatedUserId: myId,
      circleType: "INNER",
    }).exec();
    if (theyHaveMeInInner) {
      await NotificationModel.create({
        userId: relatedOid,
        type: "mutual_inner_circle",
        actorId: myId,
      });
      sendPushToUserAsync(relatedUserId, {
        title: "Mutual Inner Circle",
        body: "You and someone are now in each other's Inner Circle.",
        url: "/app/notifications",
      });
    }
  }

  return NextResponse.json({ ok: true, circleType });
}
