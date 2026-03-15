import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { getDisplayName } from "@/lib/displayName";
import { connectDB, EventModel, EventAttendeeModel, User, CircleRelationshipModel } from "@/lib/db";
import { canSeeProfileSection, type ViewerRelation } from "@/lib/visibility";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId: profileUserId } = await context.params;
  await connectDB();

  const profile = await User.findById(profileUserId)
    .select("profileVisibilityEvents")
    .lean()
    .exec();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const myId = new mongoose.Types.ObjectId(session.userId);
  const profileOid = new mongoose.Types.ObjectId(profileUserId);

  if (profileUserId !== session.userId) {
    const rel = await CircleRelationshipModel.findOne({
      userId: profileOid,
      relatedUserId: myId,
    })
      .select("circleType")
      .lean()
      .exec();
    const viewerRelation: ViewerRelation =
      rel && (rel as unknown as { circleType: string }).circleType === "INNER"
        ? "inner"
        : rel && (rel as unknown as { circleType: string }).circleType === "TRUSTED"
          ? "trusted"
          : null;
    const profileEventsVisibility = (profile as unknown as { profileVisibilityEvents?: "everyone" | "trusted_circle" | "inner_circle" })
      .profileVisibilityEvents;
    if (!canSeeProfileSection(profileEventsVisibility, viewerRelation)) {
      return NextResponse.json({ events: [] });
    }
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const myAttendance = await EventAttendeeModel.find(
    { userId: profileUserId, status: { $in: ["going", "interested", "accepted"] } },
    { eventId: 1 }
  )
    .lean()
    .exec();
  const eventIds = (myAttendance as unknown as { eventId: mongoose.Types.ObjectId }[]).map((a) => a.eventId);
  if (eventIds.length === 0) return NextResponse.json({ events: [] });

  type EventDoc = {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    hostId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string };
    location?: string;
    startAt: Date;
    endAt?: Date;
    type: string;
    coverImage?: string;
    visibility: string;
    category?: string;
    status?: string;
  };
  const events = (await EventModel.find({
    _id: { $in: eventIds },
    startAt: { $gte: thirtyDaysAgo },
    $or: [{ status: { $exists: false } }, { status: "active" }, { status: "postponed" }],
  })
    .sort({ startAt: 1 })
    .limit(50)
    .populate("hostId", "fullName name profileImage image")
    .lean()
    .exec()) as unknown as EventDoc[];

  const eids = events.map((e) => e._id);
  const attendeeCounts = await EventAttendeeModel.aggregate([
    { $match: { eventId: { $in: eids }, status: { $in: ["going", "accepted"] } } },
    { $group: { _id: "$eventId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(attendeeCounts.map((c) => [String(c._id), c.count]));

  const list = events.map((ev) => {
    const host = ev.hostId as unknown as { fullName?: string; name?: string; profileImage?: string; image?: string };
    const eid = String(ev._id);
    return {
      _id: eid,
      title: ev.title,
      description: ev.description,
      hostId: String(ev.hostId._id),
      hostName: getDisplayName(host),
      hostImage: host?.profileImage || host?.image,
      location: ev.location,
      startAt: ev.startAt,
      endAt: ev.endAt,
      type: ev.type,
      category: ev.category,
      coverImage: ev.coverImage,
      visibility: ev.visibility,
      goingCount: countMap.get(eid) ?? 0,
    };
  });

  return NextResponse.json({ events: list });
}
