import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  CircleRelationshipModel,
  EventAttendeeModel,
  EventModel,
  User,
} from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: memberId } = await params;
  if (!memberId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await connectDB();

  const myId = new mongoose.Types.ObjectId(session.userId);
  const profileOid = new mongoose.Types.ObjectId(memberId);

  if (String(myId) === memberId) {
    return NextResponse.json({
      circleRelation: { circleTypeForMe: null, mutualInner: false, reason: null },
      mutualConnectionsCount: 0,
      mutualConnectionsBreakdown: { inner: 0, trusted: 0 },
      eventsAttendedTogether: 0,
      recentSharedEvents: [],
      sharedIndustries: [],
      sharedInterests: [],
    });
  }

  const [
    myRelationship,
    theyHaveMeInInner,
    myCircleRows,
    theirCircleRows,
    myAttendeeRows,
    theirAttendeeRows,
    profileUser,
  ] = await Promise.all([
    CircleRelationshipModel.findOne({
      userId: myId,
      relatedUserId: profileOid,
    })
      .select("circleType reason")
      .lean()
      .exec(),
    CircleRelationshipModel.findOne({
      userId: profileOid,
      relatedUserId: myId,
      circleType: "INNER",
    })
      .select("_id")
      .lean()
      .exec(),
    CircleRelationshipModel.find({ userId: myId })
      .select("relatedUserId circleType")
      .lean()
      .exec(),
    CircleRelationshipModel.find({ userId: profileOid })
      .select("relatedUserId circleType")
      .lean()
      .exec(),
    EventAttendeeModel.find({
      userId: myId,
      status: { $in: ["going", "accepted"] },
    })
      .select("eventId")
      .lean()
      .exec(),
    EventAttendeeModel.find({
      userId: profileOid,
      status: { $in: ["going", "accepted"] },
    })
      .select("eventId")
      .lean()
      .exec(),
    User.findById(memberId)
      .select("industries interests communityRoles")
      .lean()
      .exec(),
  ]);

  const myRelationshipTyped = myRelationship as unknown as { circleType: string; reason?: string } | null;
  const circleTypeForMe =
    myRelationshipTyped?.circleType === "INNER"
      ? "INNER"
      : myRelationshipTyped?.circleType === "TRUSTED"
        ? "TRUSTED"
        : null;
  const mutualInner = circleTypeForMe === "INNER" && !!theyHaveMeInInner;

  const myCircleSet = new Set(
    (myCircleRows as unknown as { relatedUserId: mongoose.Types.ObjectId }[]).map((r) => String(r.relatedUserId))
  );
  const myInnerSet = new Set(
    (myCircleRows as unknown as { relatedUserId: mongoose.Types.ObjectId; circleType: string }[])
      .filter((r) => r.circleType === "INNER")
      .map((r) => String(r.relatedUserId))
  );
  const myTrustedSet = new Set(
    (myCircleRows as unknown as { relatedUserId: mongoose.Types.ObjectId; circleType: string }[])
      .filter((r) => r.circleType === "TRUSTED")
      .map((r) => String(r.relatedUserId))
  );

  const theirCircleByType = (theirCircleRows as unknown as { relatedUserId: mongoose.Types.ObjectId; circleType: string }[]).reduce(
    (acc, r) => {
      const id = String(r.relatedUserId);
      if (!acc[r.circleType]) acc[r.circleType] = new Set<string>();
      acc[r.circleType].add(id);
      return acc;
    },
    {} as Record<string, Set<string>>
  );

  let mutualInnerCount = 0;
  let mutualTrustedCount = 0;
  for (const id of theirCircleByType.INNER ?? []) {
    if (myInnerSet.has(id)) mutualInnerCount++;
    else if (myTrustedSet.has(id)) mutualTrustedCount++;
  }
  for (const id of theirCircleByType.TRUSTED ?? []) {
    if (myCircleSet.has(id) && !theirCircleByType.INNER?.has(id)) {
      if (myInnerSet.has(id)) mutualInnerCount++;
      else if (myTrustedSet.has(id)) mutualTrustedCount++;
    }
  }
  const mutualConnectionsCount = mutualInnerCount + mutualTrustedCount;

  const myEventIds = new Set(
    (myAttendeeRows as unknown as { eventId: mongoose.Types.ObjectId }[]).map((r) => String(r.eventId))
  );
  const sharedEventIds: string[] = [];
  for (const row of theirAttendeeRows as unknown as { eventId: mongoose.Types.ObjectId }[]) {
    const eid = String(row.eventId);
    if (myEventIds.has(eid)) sharedEventIds.push(eid);
  }
  const eventsAttendedTogether = sharedEventIds.length;

  let recentSharedEvents: { id: string; title: string; startAt: string }[] = [];
  if (sharedEventIds.length > 0) {
    const events = await EventModel.find({
      _id: { $in: sharedEventIds.slice(0, 5).map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("_id title startAt")
      .sort({ startAt: -1 })
      .limit(5)
      .lean()
      .exec();
    recentSharedEvents = (events as unknown as { _id: mongoose.Types.ObjectId; title: string; startAt: Date }[]).map(
      (e) => ({
        id: String(e._id),
        title: e.title,
        startAt: e.startAt.toISOString(),
      })
    );
  }

  const me = await User.findById(session.userId)
    .select("industries interests communityRoles")
    .lean()
    .exec();
  const myIndustries = new Set((me as unknown as { industries?: string[] })?.industries ?? []);
  const myInterests = new Set((me as unknown as { interests?: string[] })?.interests ?? []);
  const profileIndustries = (profileUser as unknown as { industries?: string[] })?.industries ?? [];
  const profileInterests = (profileUser as unknown as { interests?: string[] })?.interests ?? [];
  const sharedIndustries = profileIndustries.filter((i) => myIndustries.has(i));
  const sharedInterests = profileInterests.filter((i) => myInterests.has(i));

  return NextResponse.json({
    circleRelation: {
      circleTypeForMe,
      mutualInner,
      reason: myRelationshipTyped?.reason ?? null,
    },
    mutualConnectionsCount,
    mutualConnectionsBreakdown: { inner: mutualInnerCount, trusted: mutualTrustedCount },
    eventsAttendedTogether,
    recentSharedEvents,
    sharedIndustries,
    sharedInterests,
  });
}
