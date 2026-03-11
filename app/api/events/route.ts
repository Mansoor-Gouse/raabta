import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { getDisplayName } from "@/lib/displayName";
import { connectDB, EventModel, EventAttendeeModel, NotificationModel, User, CircleRelationshipModel } from "@/lib/db";
import { sendPushToUserAsync } from "@/lib/pushSend";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const attending = searchParams.get("attending");
  const dateRange = searchParams.get("dateRange");
  const locationFilter = searchParams.get("location");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const skip = Math.max(0, Number(searchParams.get("skip")) || 0);
  await connectDB();

  const ELITE_CATEGORIES = ["business", "philanthropy", "family", "religious", "luxury-trips", "education"] as const;
  const LOCATION_OPTIONS = ["Dubai", "London", "Riyadh", "Jeddah", "Makkah", "Istanbul", "Maldives", "Hyderabad", "Bangalore", "Any"];
  type EventDoc = {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    hostId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string; phone?: string };
    location?: string;
    startAt: Date;
    endAt?: Date;
    capacity?: number;
    type: string;
    coverImage?: string;
    visibility: string;
    category?: string;
    status?: string;
    featured?: boolean;
    audienceType?: string;
    eventFormat?: "online" | "offline";
    venue?: string;
    meetingLink?: string;
    meetingDetails?: string;
    meetingPlatform?: string;
  };

  let events: EventDoc[];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let startAtFilter: Record<string, Date> = { $gte: thirtyDaysAgo };
  if (dateRange === "this_week") {
    const endOfWeek = new Date(now);
    endOfWeek.setHours(23, 59, 59, 999);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()) % 7);
    startAtFilter = { $gte: now, $lte: endOfWeek };
  } else if (dateRange === "this_month") {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    startAtFilter = { $gte: now, $lte: endOfMonth };
  } else if (dateRange === "next_3_months") {
    const in3Months = new Date(now.getTime() + 92 * 24 * 60 * 60 * 1000);
    startAtFilter = { $gte: now, $lte: in3Months };
  }

  const locationQuery = locationFilter && locationFilter !== "Any" && LOCATION_OPTIONS.includes(locationFilter)
    ? { location: new RegExp(locationFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }
    : {};

  if (attending === "me") {
    const myAttendance = await EventAttendeeModel.find(
      { userId: session.userId, status: { $in: ["going", "interested", "accepted"] } },
      { eventId: 1 }
    )
      .lean()
      .exec();
    const eventIds = myAttendance.map(
      (a) =>
        (a as unknown as {
          eventId: mongoose.Types.ObjectId;
        }).eventId
    );
    if (eventIds.length === 0) {
      return NextResponse.json({ events: [] });
    }
    events = (await EventModel.find({
      _id: { $in: eventIds },
      startAt: startAtFilter,
      $or: [{ status: { $exists: false } }, { status: "active" }, { status: "postponed" }],
    })
      .sort({ startAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("hostId", "fullName name profileImage image phone")
      .lean()
      .exec()) as unknown as EventDoc[];
  } else {
    // Invite-only events: only return if user is host or has an attendee record
    const hostInviteOnly = await EventModel.find(
      { hostId: session.userId, visibility: "invite-only" },
      { _id: 1 }
    )
      .lean()
      .exec();
    const myAttendeeRows = await EventAttendeeModel.find(
      { userId: session.userId },
      { eventId: 1 }
    )
      .lean()
      .exec();
    const attendeeEventIds = (myAttendeeRows as unknown as { eventId: mongoose.Types.ObjectId }[]).map((r) => r.eventId);
    const attendeeInviteOnly =
      attendeeEventIds.length > 0
        ? await EventModel.find(
            { _id: { $in: attendeeEventIds }, visibility: "invite-only" },
            { _id: 1 }
          )
            .lean()
            .exec()
        : [];
    const allowedInviteOnlyEventIds = [
      ...new Set([
        ...(hostInviteOnly as unknown as { _id: mongoose.Types.ObjectId }[]).map((e) => e._id),
        ...(attendeeInviteOnly as unknown as { _id: mongoose.Types.ObjectId }[]).map((e) => e._id),
      ]),
    ];

    const query: Record<string, unknown> = {
      startAt: startAtFilter,
      ...locationQuery,
      $or: [{ status: { $exists: false } }, { status: "active" }, { status: "postponed" }],
      $and: [
        {
          $or: [
            { visibility: "network" },
            { visibility: "invite-only", _id: { $in: allowedInviteOnlyEventIds } },
          ],
        },
      ],
    };
    if (type && ["event", "trip", "retreat", "umrah", "hajj"].includes(type)) query.type = type;
    if (category && ELITE_CATEGORIES.includes(category as (typeof ELITE_CATEGORIES)[number])) query.category = category;
    events = (await EventModel.find(query)
      .sort({ startAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("hostId", "fullName name profileImage image phone")
      .lean()
      .exec()) as unknown as EventDoc[];
  }

  const eventIds = events.map((e) => (e as unknown as { _id: mongoose.Types.ObjectId })._id);
  const myAttendanceRows = await EventAttendeeModel.find(
    { eventId: { $in: eventIds }, userId: session.userId },
    { eventId: 1, status: 1 }
  )
    .lean()
    .exec();
  const myStatusByEvent = new Map<string, string>();
  for (const row of myAttendanceRows as unknown as { eventId: mongoose.Types.ObjectId; status: string }[]) {
    myStatusByEvent.set(String(row.eventId), row.status);
  }
  const attendeeCounts = await EventAttendeeModel.aggregate([
    { $match: { eventId: { $in: eventIds }, status: { $in: ["going", "accepted"] } } },
    { $group: { _id: "$eventId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(attendeeCounts.map((c) => [String(c._id), c.count]));

  const attendeePreviewAgg = await EventAttendeeModel.aggregate([
    { $match: { eventId: { $in: eventIds }, status: { $in: ["going", "accepted"] } } },
    { $sort: { eventId: 1, createdAt: 1 } },
    { $group: { _id: "$eventId", userIds: { $push: "$userId" } } },
    { $project: { userIds: { $slice: ["$userIds", 5] } } },
    { $lookup: { from: "users", localField: "userIds", foreignField: "_id", as: "users" } },
  ]);
  type PreviewUser = { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string; phone?: string; headline?: string; location?: string };
  const previewByEvent = new Map<string, { userId: string; name: string; image?: string | null; headline?: string; location?: string }[]>();
  for (const row of attendeePreviewAgg) {
    const users = (row.users as PreviewUser[]) || [];
    previewByEvent.set(String(row._id), users.map((u) => ({
      userId: String(u._id),
      name: getDisplayName(u),
      image: u?.profileImage || u?.image || null,
      headline: u?.headline,
      location: u?.location,
    })));
  }

  let userLocation: string | null = null;
  try {
    const me = await User.findById(session.userId).select("location").lean().exec();
    userLocation = (me as unknown as { location?: string } | null)?.location ?? null;
  } catch {
    userLocation = null;
  }

  const fromYourCityMap = new Map<string, number>();
  if (userLocation && userLocation.trim()) {
    const normalizedLocation = userLocation.trim().toLowerCase();
    const hostIds = events.map((e) => (e as EventDoc).hostId._id);
    const attendeeRows = await EventAttendeeModel.find(
      { eventId: { $in: eventIds }, status: { $in: ["going", "accepted"] } },
      { eventId: 1, userId: 1 }
    )
      .lean()
      .exec();
    const eventToAttendeeIds = new Map<string, mongoose.Types.ObjectId[]>();
    for (const row of attendeeRows as unknown as { eventId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId }[]) {
      const eid = String(row.eventId);
      if (!eventToAttendeeIds.has(eid)) eventToAttendeeIds.set(eid, []);
      eventToAttendeeIds.get(eid)!.push(row.userId);
    }
    const allUserIds = [...new Set([...hostIds, ...(attendeeRows as unknown as { userId: mongoose.Types.ObjectId }[]).map((r) => r.userId)])];
    const usersWithLocation = await User.find(
      { _id: { $in: allUserIds }, location: { $exists: true, $ne: "" } },
      { _id: 1, location: 1 }
    )
      .lean()
      .exec();
    const sameCityIds = new Set(
      (usersWithLocation as unknown as { _id: mongoose.Types.ObjectId; location?: string }[])
        .filter((u) => u.location && u.location.trim().toLowerCase() === normalizedLocation)
        .map((u) => String(u._id))
    );
    for (const e of events) {
      const ev = e as EventDoc;
      const eid = String(ev._id);
      let count = sameCityIds.has(String(ev.hostId._id)) ? 1 : 0;
      const aids = eventToAttendeeIds.get(eid) || [];
      count += aids.filter((id) => sameCityIds.has(String(id))).length;
      fromYourCityMap.set(eid, count);
    }
  }

  const list = events.map((e) => {
    const ev = e as EventDoc;
    const host = ev.hostId as unknown as { fullName?: string; name?: string; profileImage?: string; image?: string; phone?: string };
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
      capacity: ev.capacity,
      type: ev.type,
      category: ev.category,
      coverImage: ev.coverImage,
      visibility: ev.visibility,
      featured: ev.featured ?? false,
      goingCount: countMap.get(eid) ?? 0,
      status: ev.status ?? "active",
      attendeePreview: previewByEvent.get(eid) || [],
      fromYourCity: fromYourCityMap.get(eid) ?? 0,
      fromYourNetwork: 0,
      myStatus: myStatusByEvent.get(eid) ?? null,
      audienceType: ev.audienceType ?? undefined,
      eventFormat: ev.eventFormat ?? "offline",
      venue: ev.venue,
      meetingLink: ev.meetingLink,
      meetingDetails: ev.meetingDetails,
      meetingPlatform: ev.meetingPlatform,
    };
  });

  // Discover order: events that are not host, not going, visibility=network, status=active, not featured; sorted by score
  let discoverOrder: string[] = [];
  if (attending !== "me" && list.length > 0) {
    const hostIdStr = String(session.userId);
    const goingIds = new Set(
      (myAttendanceRows as unknown as { eventId: mongoose.Types.ObjectId; status: string }[])
        .filter((r) => r.status === "going" || r.status === "accepted")
        .map((r) => String(r.eventId))
    );
    const discoverCandidates = list.filter(
      (ev) =>
        ev.hostId !== hostIdStr &&
        !goingIds.has(ev._id) &&
        ev.visibility === "network" &&
        ev.status === "active" &&
        !ev.featured
    );
    let userInterests: string[] = [];
    try {
      const me = await User.findById(session.userId).select("interests").lean().exec();
      userInterests = ((me as unknown as { interests?: string[] } | null)?.interests ?? []).map((s) => s?.toLowerCase?.() ?? "");
    } catch {
      userInterests = [];
    }
    const nowTs = Date.now();
    const maxGoing = Math.max(1, ...list.map((e) => e.goingCount));
    const discoverWithScore = discoverCandidates.map((ev) => {
      const startTs = new Date(ev.startAt).getTime();
      const daysUntil = Math.max(0, (startTs - nowTs) / (24 * 60 * 60 * 1000));
      const dateProximity = daysUntil <= 0 ? 1 : Math.max(0, 1 - daysUntil / 92);
      const categoryMatch = ev.category && userInterests.includes(ev.category.toLowerCase()) ? 1 : 0;
      const popularity = maxGoing > 0 ? ev.goingCount / maxGoing : 0;
      const score = 0.4 * dateProximity + 0.2 * categoryMatch + 0.1 * popularity;
      return { _id: ev._id, score };
    });
    discoverWithScore.sort((a, b) => b.score - a.score);
    discoverOrder = discoverWithScore.map((d) => d._id);
  }

  const hasMore = list.length === limit;
  return NextResponse.json({ events: list, hasMore, discoverOrder });
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const {
    title,
    description,
    location,
    startAt,
    endAt,
    capacity,
    type,
    coverImage,
    visibility,
    category,
    dressCode,
    etiquette,
    halalMenuDetails,
    prayerFacilityInfo,
    allowGuestRequest,
    allowBringGuest,
    gatheringFormat,
    atmosphere,
    hospitalityStyle,
    specialGuestsNote,
    networkingIntent,
    audienceType,
    invitedUserIds,
    inviteInnerCircle,
    inviteTrustedCircle,
    eventFormat,
    venue,
    meetingLink,
    meetingDetails,
    meetingPlatform,
  } = body as Record<string, unknown>;
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const start = startAt ? new Date(startAt as string) : new Date();
  if (isNaN(start.getTime())) return NextResponse.json({ error: "Invalid startAt" }, { status: 400 });
  let end: Date | undefined;
  if (endAt != null && endAt !== "") {
    end = new Date(endAt as string);
    if (isNaN(end.getTime())) return NextResponse.json({ error: "Invalid endAt" }, { status: 400 });
    if (end.getTime() < start.getTime()) return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }
  const format = eventFormat === "online" ? "online" : "offline";
  const locStr = typeof location === "string" ? location.trim() : "";
  const venueStr = typeof venue === "string" ? venue.trim() : "";
  const meetingLinkStr = typeof meetingLink === "string" ? meetingLink.trim() : "";
  const meetingDetailsStr = typeof meetingDetails === "string" ? meetingDetails.trim() : undefined;
  if (format === "online") {
    if (!meetingLinkStr) {
      return NextResponse.json({ error: "Meeting link is required for online events" }, { status: 400 });
    }
  } else {
    if (!locStr) {
      return NextResponse.json({ error: "Location is required for offline events" }, { status: 400 });
    }
    if (!venueStr) {
      return NextResponse.json({ error: "Venue is required for offline events" }, { status: 400 });
    }
  }
  const eventType = type && ["event", "trip", "retreat", "umrah", "hajj"].includes(type as string) ? (type as string) : "event";
  const ELITE_CATEGORIES = ["business", "philanthropy", "family", "religious", "luxury-trips", "education"];
  const eventCategory =
    category && ELITE_CATEGORIES.includes(category as string) ? (category as string) : undefined;
  await connectDB();
  const event = await EventModel.create({
    title: (title as string).trim(),
    description: typeof description === "string" ? description.trim() : undefined,
    hostId: session.userId,
    location: format === "offline" ? locStr || undefined : undefined,
    venue: format === "offline" ? venueStr || undefined : undefined,
    meetingLink: format === "online" ? meetingLinkStr || undefined : undefined,
    meetingDetails: format === "online" ? meetingDetailsStr : undefined,
    meetingPlatform:
      format === "online" && meetingPlatform && typeof meetingPlatform === "string"
        ? (["zoom", "google-meet", "teams", "webex", "other"].includes(meetingPlatform.trim()) ? meetingPlatform.trim() : undefined)
        : undefined,
    eventFormat: format,
    startAt: start,
    endAt: end,
    capacity: typeof capacity === "number" && capacity > 0 ? capacity : undefined,
    type: eventType,
    coverImage: typeof coverImage === "string" ? coverImage : undefined,
    visibility: visibility === "invite-only" ? "invite-only" : "network",
    category: eventCategory,
    dressCode: typeof dressCode === "string" ? dressCode.trim() : undefined,
    etiquette: typeof etiquette === "string" ? etiquette.trim() : undefined,
    halalMenuDetails: typeof halalMenuDetails === "string" ? halalMenuDetails.trim() : undefined,
    prayerFacilityInfo: typeof prayerFacilityInfo === "string" ? prayerFacilityInfo.trim() : undefined,
    allowGuestRequest: typeof allowGuestRequest === "boolean" ? allowGuestRequest : undefined,
    allowBringGuest: typeof allowBringGuest === "boolean" ? allowBringGuest : undefined,
    gatheringFormat: typeof gatheringFormat === "string" ? gatheringFormat.trim() : undefined,
    atmosphere: typeof atmosphere === "string" ? atmosphere.trim() : undefined,
    hospitalityStyle: typeof hospitalityStyle === "string" ? hospitalityStyle.trim() : undefined,
    specialGuestsNote: typeof specialGuestsNote === "string" ? specialGuestsNote.trim() : undefined,
    networkingIntent: typeof networkingIntent === "string" ? networkingIntent.trim() : undefined,
    audienceType:
      audienceType && ["open", "men-only", "family", "business", "members-only"].includes(audienceType as string)
        ? (audienceType as string)
        : undefined,
  });
  await EventAttendeeModel.create({ eventId: event._id, userId: session.userId, status: "going" });

  const hostId = new mongoose.Types.ObjectId(session.userId);
  const explicitIds = Array.isArray(invitedUserIds)
    ? (invitedUserIds as unknown[]).filter((id): id is string => typeof id === "string" && id !== String(session.userId))
    : [];
  const circleIds: string[] = [];
  if (inviteInnerCircle === true) {
    const inner = await CircleRelationshipModel.find({ userId: hostId, circleType: "INNER" })
      .select("relatedUserId")
      .lean()
      .exec();
    circleIds.push(...inner.map((r) => String((r as unknown as { relatedUserId: mongoose.Types.ObjectId }).relatedUserId)));
  }
  if (inviteTrustedCircle === true) {
    const trusted = await CircleRelationshipModel.find({ userId: hostId, circleType: "TRUSTED" })
      .select("relatedUserId")
      .lean()
      .exec();
    circleIds.push(...trusted.map((r) => String((r as unknown as { relatedUserId: mongoose.Types.ObjectId }).relatedUserId)));
  }
  const fromCircle = inviteInnerCircle === true || inviteTrustedCircle === true;
  const allInvitedIds = [...new Set([...explicitIds, ...circleIds])].filter((id) => id !== session.userId);
  const validIds: mongoose.Types.ObjectId[] = [];
  for (const id of allInvitedIds) {
    try {
      validIds.push(new mongoose.Types.ObjectId(id));
    } catch {
      // skip invalid id
    }
  }
  if (validIds.length > 0) {
    await EventAttendeeModel.insertMany(
      validIds.map((userId) => ({ eventId: event._id, userId, status: "invited" }))
    );
    const eventTitle = (event as unknown as { title?: string }).title ?? "Event";
    const circleIdSet = new Set(circleIds);
    for (const uid of validIds) {
      const uidStr = String(uid);
      const isFromCircle = fromCircle && circleIdSet.has(uidStr);
      await NotificationModel.create({
        userId: uid,
        type: isFromCircle ? "circle_event_invite" : "event_invite",
        eventId: event._id,
        actorId: session.userId,
      });
      sendPushToUserAsync(uidStr, {
        title: isFromCircle ? "Inner Circle event invitation" : "Event invitation",
        body: eventTitle,
        url: `/app/events/${event._id}`,
      });
    }
  }
  const created = await EventModel.findById(event._id).populate("hostId", "fullName name profileImage image").lean().exec();
  const ev = created as unknown as {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    hostId: { fullName?: string; name?: string };
    location?: string;
    venue?: string;
    startAt: Date;
    endAt?: Date;
    capacity?: number;
    type: string;
    coverImage?: string;
    visibility: string;
    eventFormat?: "online" | "offline";
    meetingLink?: string;
    meetingDetails?: string;
  };
  return NextResponse.json({
    _id: String(ev._id),
    title: ev.title,
    description: ev.description,
    hostId: session.userId,
    hostName: ev.hostId?.fullName || ev.hostId?.name || "Host",
    location: ev.location,
    venue: ev.venue,
    eventFormat: ev.eventFormat ?? "offline",
    meetingLink: ev.meetingLink,
    meetingDetails: ev.meetingDetails,
    startAt: ev.startAt,
    endAt: ev.endAt,
    capacity: ev.capacity,
    type: ev.type,
    coverImage: ev.coverImage,
    visibility: ev.visibility,
    goingCount: 1,
  });
}
