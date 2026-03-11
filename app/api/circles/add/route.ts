import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  CircleRelationshipModel,
  User,
  NotificationModel,
  INNER_CIRCLE_MAX,
  TRUSTED_CIRCLE_MAX,
  type CircleReason,
} from "@/lib/db";
import { sendPushToUserAsync } from "@/lib/pushSend";

const CIRCLE_REASONS: CircleReason[] = [
  "mentor",
  "collaborator",
  "trusted_advisor",
  "intellectual_companion",
  "friend",
];

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as {
    relatedUserId?: string;
    circleType?: string;
    reason?: string;
  };
  const { relatedUserId, circleType, reason } = body;
  if (!relatedUserId || typeof relatedUserId !== "string") {
    return NextResponse.json({ error: "relatedUserId is required" }, { status: 400 });
  }
  if (!circleType || !["TRUSTED", "INNER"].includes(circleType)) {
    return NextResponse.json({ error: "circleType must be TRUSTED or INNER" }, { status: 400 });
  }
  if (reason != null && !CIRCLE_REASONS.includes(reason as CircleReason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  if (relatedUserId === session.userId) {
    return NextResponse.json({ error: "Cannot add yourself to a circle" }, { status: 400 });
  }
  let relatedOid: mongoose.Types.ObjectId;
  try {
    relatedOid = new mongoose.Types.ObjectId(relatedUserId);
  } catch {
    return NextResponse.json({ error: "Invalid relatedUserId" }, { status: 400 });
  }

  await connectDB();

  const exists = await User.findById(relatedOid).select("_id").lean().exec();
  if (!exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const myId = new mongoose.Types.ObjectId(session.userId);

  const [existing, innerCount, trustedCount] = await Promise.all([
    CircleRelationshipModel.findOne({
      userId: myId,
      relatedUserId: relatedOid,
    }).exec(),
    CircleRelationshipModel.countDocuments({
      userId: myId,
      circleType: "INNER",
    }).exec(),
    CircleRelationshipModel.countDocuments({
      userId: myId,
      circleType: "TRUSTED",
    }).exec(),
  ]);

  const alreadyInTarget =
    existing && (existing.circleType as string) === circleType;
  if (circleType === "INNER" && !alreadyInTarget && innerCount >= INNER_CIRCLE_MAX) {
    return NextResponse.json(
      {
        error: `Inner Circle is full (${INNER_CIRCLE_MAX}). Remove someone to add this person.`,
        code: "INNER_CIRCLE_FULL",
      },
      { status: 400 }
    );
  }
  if (circleType === "TRUSTED" && !alreadyInTarget && trustedCount >= TRUSTED_CIRCLE_MAX) {
    return NextResponse.json(
      {
        error: `Trusted Circle is full (${TRUSTED_CIRCLE_MAX}). Remove someone to add this person.`,
        code: "TRUSTED_CIRCLE_FULL",
      },
      { status: 400 }
    );
  }

  const wasInner = existing?.circleType === "INNER";

  await CircleRelationshipModel.findOneAndUpdate(
    { userId: myId, relatedUserId: relatedOid },
    {
      userId: myId,
      relatedUserId: relatedOid,
      circleType: circleType as "TRUSTED" | "INNER",
      ...(reason ? { reason: reason as CircleReason } : {}),
    },
    { upsert: true, new: true }
  );

  const isNowInner = circleType === "INNER";
  const theyHaveMeInInner = isNowInner
    ? await CircleRelationshipModel.findOne({
        userId: relatedOid,
        relatedUserId: myId,
        circleType: "INNER",
      }).exec()
    : null;

  await NotificationModel.create({
    userId: relatedOid,
    type: "circle_added",
    actorId: myId,
  });

  if (theyHaveMeInInner) {
    await NotificationModel.create({
      userId: relatedOid,
      type: "mutual_inner_circle",
      actorId: myId,
    });
  }

  sendPushToUserAsync(relatedUserId, {
    title: "Added to a circle",
    body: wasInner
      ? "Someone updated your place in their circle."
      : "You were added to someone's Trusted or Inner Circle.",
    url: "/app/notifications",
  });

  return NextResponse.json({ ok: true, circleType });
}
