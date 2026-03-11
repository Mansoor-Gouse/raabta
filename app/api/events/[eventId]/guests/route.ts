import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { getDisplayName } from "@/lib/displayName";
import { connectDB, EventModel, EventAttendeeModel, EventEntryPassModel, NotificationModel } from "@/lib/db";
import { sendPushToUserAsync } from "@/lib/pushSend";

const USER_POPULATE = "fullName name profileImage image phone headline location";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }
  await connectDB();
  const event = await EventModel.findById(eventId).lean().exec();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const ev = event as unknown as { hostId: mongoose.Types.ObjectId; capacity?: number };
  if (String(ev.hostId) !== String(session.userId)) {
    return NextResponse.json({ error: "Only the host can view guest requests" }, { status: 403 });
  }
  const [accepted, pending, waitlisted, declined, invited, checkedInCount] = await Promise.all([
    EventAttendeeModel.find({ eventId, status: { $in: ["going", "accepted"] } })
      .populate("userId", USER_POPULATE)
      .lean()
      .exec(),
    EventAttendeeModel.find({ eventId, status: "request-invite" })
      .populate("userId", USER_POPULATE)
      .lean()
      .exec(),
    EventAttendeeModel.find({ eventId, status: "waitlisted" })
      .populate("userId", USER_POPULATE)
      .lean()
      .exec(),
    EventAttendeeModel.find({ eventId, status: "declined" })
      .populate("userId", "fullName name profileImage image phone")
      .lean()
      .exec(),
    EventAttendeeModel.find({ eventId, status: "invited" })
      .populate("userId", "fullName name profileImage image phone headline location")
      .lean()
      .exec(),
    EventEntryPassModel.countDocuments({ eventId, checkedInAt: { $exists: true, $ne: null } }).exec(),
  ]);

  const userIdsFromPendingAndWaitlist = [
    ...pending.map((a) => (a as unknown as { userId: mongoose.Types.ObjectId }).userId),
    ...waitlisted.map((a) => (a as unknown as { userId: mongoose.Types.ObjectId }).userId),
  ].filter((id): id is mongoose.Types.ObjectId => id != null);
  const attendedCounts = await Promise.all(
    userIdsFromPendingAndWaitlist.map(async (uid) => {
      const count = await EventAttendeeModel.countDocuments({
        userId: uid,
        status: { $in: ["going", "accepted"] },
      }).exec();
      return { userId: String(uid), attendedEventsCount: count };
    })
  );
  const attendedMap = new Map(attendedCounts.map((c) => [c.userId, c.attendedEventsCount]));

  type PopulatedUser = {
    _id: mongoose.Types.ObjectId;
    fullName?: string;
    name?: string;
    profileImage?: string;
    image?: string;
    phone?: string;
    headline?: string;
    location?: string;
  };
  type AttendeeDoc = {
    userId: PopulatedUser;
    vipTag?: boolean;
    requestNote?: string;
    networkingIntent?: string;
    guestTier?: string;
  };

  const toAttendee = (
    a: unknown,
    opts: { includeNote?: boolean; includeTrust?: boolean; includeTier?: boolean } = {}
  ) => {
    const att = a as AttendeeDoc;
    const u = att.userId as PopulatedUser;
    const out: {
      userId: string;
      name: string;
      image?: string;
      vipTag: boolean;
      requestNote?: string;
      headline?: string;
      location?: string;
      networkingIntent?: string;
      attendedEventsCount?: number;
      mutualConnectionsCount?: number;
      guestTier?: string;
    } = {
      userId: String(u._id),
      name: getDisplayName(u),
      image: u.profileImage || u.image,
      vipTag: att.vipTag ?? false,
    };
    if (opts.includeNote && att.requestNote) out.requestNote = att.requestNote;
    if (u.headline) out.headline = u.headline;
    if (u.location) out.location = u.location;
    if (att.networkingIntent) out.networkingIntent = att.networkingIntent;
    if (opts.includeTrust) {
      out.attendedEventsCount = attendedMap.get(String(u._id)) ?? 0;
      out.mutualConnectionsCount = 0;
    }
    if (opts.includeTier && att.guestTier) out.guestTier = att.guestTier;
    return out;
  };

  const toDeclined = (a: unknown) => {
    const att = a as unknown as { userId: PopulatedUser };
    const u = att.userId;
    return {
      userId: String(u._id),
      name: getDisplayName(u),
      image: u.profileImage || u.image,
    };
  };

  return NextResponse.json({
    accepted: accepted.map((a) => toAttendee(a, { includeTier: true })),
    pending: pending.map((a) => toAttendee(a, { includeNote: true, includeTrust: true })),
    waitlisted: waitlisted.map((a) => toAttendee(a, { includeNote: true, includeTrust: true })),
    declined: declined.map(toDeclined),
    invited: invited.map((a) => toAttendee(a)),
    capacity: ev.capacity,
    checkedInCount: checkedInCount ?? 0,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }
  const body = (await request.json()) as {
    userId?: string;
    userIds?: string[];
    action?: string;
    guestTier?: string;
  };
  const { userId: targetUserId, userIds, action, guestTier } = body;
  await connectDB();
  const event = await EventModel.findById(eventId).lean().exec();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const ev = event as unknown as { hostId: mongoose.Types.ObjectId; capacity?: number; title?: string };
  if (String(ev.hostId) !== String(session.userId)) {
    return NextResponse.json({ error: "Only the host can manage guests" }, { status: 403 });
  }

  if (action === "remove") {
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    const targetOid = new mongoose.Types.ObjectId(targetUserId);
    if (String(targetOid) === String(session.userId)) {
      return NextResponse.json({ error: "Cannot remove yourself as host" }, { status: 400 });
    }
    const updated = await EventAttendeeModel.findOneAndUpdate(
      { eventId, userId: targetOid, status: { $in: ["going", "accepted"] } },
      { $set: { status: "declined" as const } },
      { new: true }
    ).exec();
    if (!updated) {
      return NextResponse.json({ error: "Guest not found or not attending" }, { status: 404 });
    }
    await NotificationModel.create({
      userId: targetOid,
      type: "event_removed" as const,
      eventId: new mongoose.Types.ObjectId(eventId),
      actorId: session.userId,
    });
    sendPushToUserAsync(targetUserId, {
      title: "Removed from event",
      body: ev.title ?? "You were removed from an event",
      url: `/app/events/${eventId}`,
    });
    return NextResponse.json({ ok: true, removed: true });
  }

  if (action === "setTier") {
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    const tier = typeof guestTier === "string" ? guestTier.trim().slice(0, 64) || null : null;
    await EventAttendeeModel.findOneAndUpdate(
      { eventId, userId: targetUserId },
      { $set: { guestTier: tier ?? undefined } }
    ).exec();
    return NextResponse.json({ ok: true, guestTier: tier });
  }

  if (action === "invite" && Array.isArray(userIds) && userIds.length > 0) {
    const validIds = (userIds as unknown[])
      .filter((id): id is string => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
      .filter((id) => id !== String(session.userId));
    const existing = await EventAttendeeModel.find({
      eventId,
      userId: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
      status: { $in: ["going", "accepted"] },
    })
      .select("userId")
      .lean()
      .exec();
    const alreadyGoing = new Set(existing.map((e) => String((e as unknown as { userId: mongoose.Types.ObjectId }).userId)));
    const toInvite = validIds.filter((id) => !alreadyGoing.has(id));
    if (toInvite.length === 0) {
      return NextResponse.json({ ok: true, invited: 0, message: "No new users to invite" });
    }
    await EventAttendeeModel.bulkWrite(
      toInvite.map((uid) => ({
        updateOne: {
          filter: { eventId: new mongoose.Types.ObjectId(eventId), userId: new mongoose.Types.ObjectId(uid) },
          update: { $set: { status: "invited" as const } },
          upsert: true,
        },
      }))
    );
    await NotificationModel.insertMany(
      toInvite.map((userId) => ({
        userId: new mongoose.Types.ObjectId(userId),
        type: "event_invite" as const,
        eventId: new mongoose.Types.ObjectId(eventId),
        actorId: session.userId,
      }))
    );
    return NextResponse.json({ ok: true, invited: toInvite.length });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "Action must be approve, reject, setTier, invite, or remove" },
      { status: 400 }
    );
  }
  if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  if (action === "approve" && typeof ev.capacity === "number" && ev.capacity > 0) {
    const currentAccepted = await EventAttendeeModel.countDocuments({
      eventId,
      status: { $in: ["going", "accepted"] },
    }).exec();
    if (currentAccepted >= ev.capacity) {
      return NextResponse.json(
        { error: "Event is at capacity; cannot approve more guests" },
        { status: 409 }
      );
    }
  }
  await EventAttendeeModel.findOneAndUpdate(
    { eventId, userId: targetUserId },
    { $set: { status: action === "approve" ? "accepted" : "declined" } }
  ).exec();
  await NotificationModel.create({
    userId: new mongoose.Types.ObjectId(targetUserId),
    type: action === "approve" ? "event_request_approved" : "event_request_rejected",
    eventId: new mongoose.Types.ObjectId(eventId),
    actorId: session.userId,
  });
  const eventTitle = ev.title ?? "Event";
  sendPushToUserAsync(targetUserId, {
    title: action === "approve" ? "Request approved" : "Request declined",
    body: eventTitle,
    url: `/app/events/${eventId}`,
  });
  return NextResponse.json({ ok: true, status: action === "approve" ? "accepted" : "declined" });
}
