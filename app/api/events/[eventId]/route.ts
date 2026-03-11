import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { getDisplayName } from "@/lib/displayName";
import { connectDB, EventModel, EventAttendeeModel } from "@/lib/db";

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
  const event = await EventModel.findById(eventId).populate("hostId", "fullName name profileImage image phone").lean().exec();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const ev = event as unknown as {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    hostId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string; phone?: string };
    location?: string;
    venue?: string;
    startAt: Date;
    endAt?: Date;
    capacity?: number;
    type: string;
    coverImage?: string;
    visibility: string;
    channelId?: string;
    channelType?: "messaging" | "team";
    category?: string;
    dressCode?: string;
    etiquette?: string;
    halalMenuDetails?: string;
    prayerFacilityInfo?: string;
    allowGuestRequest?: boolean;
    allowBringGuest?: boolean;
    status?: string;
    audienceType?: string;
    eventFormat?: "online" | "offline";
    meetingLink?: string;
    meetingDetails?: string;
    meetingPlatform?: string;
  };
  const hostId = ev.hostId._id;
  const [goingCount, myAttendance, hostEventsCount] = await Promise.all([
    EventAttendeeModel.countDocuments({ eventId, status: { $in: ["going", "accepted"] } }).exec(),
    EventAttendeeModel.findOne({ eventId, userId: session.userId }, { status: 1, vipTag: 1, networkingIntent: 1 }).lean().exec(),
    EventModel.countDocuments({ hostId }).exec(),
  ]);
  // Invite-only: only host or users with an attendee record may view
  if (ev.visibility === "invite-only") {
    const isHost = String(hostId) === String(session.userId);
    const hasAttendeeRecord = !!myAttendance;
    if (!isHost && !hasAttendeeRecord) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
  }
  const attendees = await EventAttendeeModel.find({ eventId, status: { $in: ["going", "accepted"] } })
    .sort({ createdAt: 1 })
    .limit(20)
    .populate("userId", "fullName name profileImage image phone")
    .lean()
    .exec();
  const myAtt = myAttendance as { status?: string; vipTag?: boolean; networkingIntent?: string } | null;
  return NextResponse.json({
    _id: String(ev._id),
    title: ev.title,
    description: ev.description,
    hostId: String(ev.hostId._id),
    hostName: ev.hostId.fullName || ev.hostId.name || "Host",
    hostImage: ev.hostId.profileImage || ev.hostId.image,
    location: ev.location,
    venue: ev.venue,
    eventFormat: ev.eventFormat ?? "offline",
    meetingLink: ev.meetingLink,
    meetingDetails: ev.meetingDetails,
    meetingPlatform: ev.meetingPlatform,
    startAt: ev.startAt,
    endAt: ev.endAt,
    capacity: ev.capacity,
    type: ev.type,
    coverImage: ev.coverImage,
    visibility: ev.visibility,
    channelId: ev.channelId,
    channelType: ev.channelType ?? undefined,
    category: ev.category,
    dressCode: ev.dressCode,
    etiquette: ev.etiquette,
    halalMenuDetails: ev.halalMenuDetails,
    prayerFacilityInfo: ev.prayerFacilityInfo,
    allowGuestRequest: ev.allowGuestRequest,
    allowBringGuest: ev.allowBringGuest,
    status: ev.status ?? "active",
    audienceType: ev.audienceType ?? undefined,
    goingCount,
    hostEventsCount,
    myStatus: myAtt?.status ?? null,
    myVipTag: myAtt?.vipTag ?? false,
    myNetworkingIntent: myAtt?.networkingIntent ?? null,
    attendees: attendees.map((a) => {
      const att = a as unknown as {
        userId: {
          _id: mongoose.Types.ObjectId;
          fullName?: string;
          name?: string;
          profileImage?: string;
          image?: string;
          phone?: string;
        };
        vipTag?: boolean;
      };
      const u = att.userId;
      return {
        userId: String(u._id),
        name: getDisplayName(u),
        image: u.profileImage || u.image,
        vipTag: att.vipTag ?? false,
      };
    }),
  });
}

const ELITE_CATEGORIES = ["business", "philanthropy", "family", "religious", "luxury-trips", "education"];
const AUDIENCE_TYPES = ["open", "men-only", "family", "business", "members-only"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    title?: string;
    description?: string;
    location?: string;
    startAt?: string;
    endAt?: string;
    capacity?: number;
    visibility?: string;
    category?: string;
    dressCode?: string;
    etiquette?: string;
    halalMenuDetails?: string;
    prayerFacilityInfo?: string;
    allowGuestRequest?: boolean;
    allowBringGuest?: boolean;
    coverImage?: string;
    audienceType?: string;
    eventFormat?: "online" | "offline";
    venue?: string;
    meetingLink?: string;
    meetingDetails?: string;
    meetingPlatform?: string;
  };
  await connectDB();
  const event = await EventModel.findById(eventId)
    .select("hostId capacity location venue eventFormat meetingLink meetingPlatform")
    .lean()
    .exec();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const hostId = (event as unknown as { hostId: mongoose.Types.ObjectId }).hostId;
  if (String(hostId) !== String(session.userId)) {
    return NextResponse.json({ error: "Only the host can update this event" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};

  if (body.status != null) {
    if (!["active", "cancelled", "postponed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status; use active, cancelled, or postponed" }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.title != null) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    updates.title = title;
  }
  if (body.description !== undefined) {
    updates.description = typeof body.description === "string" ? body.description.trim() || undefined : undefined;
  }
  if (body.location !== undefined) {
    updates.location = typeof body.location === "string" ? body.location.trim() || undefined : undefined;
  }
  if (body.startAt != null) {
    const start = new Date(body.startAt);
    if (isNaN(start.getTime())) return NextResponse.json({ error: "Invalid startAt" }, { status: 400 });
    updates.startAt = start;
  }
  if (body.endAt !== undefined) {
    if (body.endAt == null || body.endAt === "") {
      updates.endAt = undefined;
    } else {
      const end = new Date(body.endAt);
      if (isNaN(end.getTime())) return NextResponse.json({ error: "Invalid endAt" }, { status: 400 });
      updates.endAt = end;
    }
  }
  if (body.capacity !== undefined) {
    if (typeof body.capacity !== "number" || body.capacity < 0) {
      return NextResponse.json({ error: "Capacity must be a non-negative number" }, { status: 400 });
    }
    updates.capacity = body.capacity === 0 ? undefined : body.capacity;
  }
  if (body.visibility != null) {
    if (body.visibility !== "network" && body.visibility !== "invite-only") {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }
    updates.visibility = body.visibility;
  }
  if (body.category !== undefined) {
    updates.category =
      body.category && ELITE_CATEGORIES.includes(body.category) ? body.category : undefined;
  }
  if (body.dressCode !== undefined) {
    updates.dressCode = typeof body.dressCode === "string" ? body.dressCode.trim() || undefined : undefined;
  }
  if (body.etiquette !== undefined) {
    updates.etiquette = typeof body.etiquette === "string" ? body.etiquette.trim() || undefined : undefined;
  }
  if (body.halalMenuDetails !== undefined) {
    updates.halalMenuDetails =
      typeof body.halalMenuDetails === "string" ? body.halalMenuDetails.trim() || undefined : undefined;
  }
  if (body.prayerFacilityInfo !== undefined) {
    updates.prayerFacilityInfo =
      typeof body.prayerFacilityInfo === "string" ? body.prayerFacilityInfo.trim() || undefined : undefined;
  }
  if (typeof body.allowGuestRequest === "boolean") updates.allowGuestRequest = body.allowGuestRequest;
  if (typeof body.allowBringGuest === "boolean") updates.allowBringGuest = body.allowBringGuest;
  if (body.coverImage !== undefined) {
    updates.coverImage = typeof body.coverImage === "string" ? body.coverImage || undefined : undefined;
  }
  if (body.audienceType !== undefined) {
    updates.audienceType =
      body.audienceType && AUDIENCE_TYPES.includes(body.audienceType) ? body.audienceType : undefined;
  }
  if (body.eventFormat !== undefined) {
    if (body.eventFormat !== "online" && body.eventFormat !== "offline") {
      return NextResponse.json({ error: "Invalid eventFormat; use online or offline" }, { status: 400 });
    }
    updates.eventFormat = body.eventFormat;
  }
  if (body.venue !== undefined) {
    updates.venue = typeof body.venue === "string" ? body.venue.trim() || undefined : undefined;
  }
  if (body.meetingLink !== undefined) {
    updates.meetingLink = typeof body.meetingLink === "string" ? body.meetingLink.trim() || undefined : undefined;
  }
  if (body.meetingDetails !== undefined) {
    updates.meetingDetails =
      typeof body.meetingDetails === "string" ? body.meetingDetails.trim() || undefined : undefined;
  }
  if (body.meetingPlatform !== undefined) {
    const v = typeof body.meetingPlatform === "string" ? body.meetingPlatform.trim() : "";
    updates.meetingPlatform = ["zoom", "google-meet", "teams", "webex", "other"].includes(v) ? v : undefined;
  }

  const existing = event as unknown as {
    location?: string;
    venue?: string;
    eventFormat?: "online" | "offline";
    meetingLink?: string;
    meetingPlatform?: string;
    startAt?: Date;
    endAt?: Date;
  };
  const effStart = (updates.startAt as Date | undefined) ?? existing.startAt;
  const effEnd = Object.prototype.hasOwnProperty.call(updates, "endAt")
    ? (updates.endAt as Date | undefined)
    : existing.endAt;
  if (effStart != null && effEnd != null && new Date(effEnd).getTime() < new Date(effStart).getTime()) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }
  const effFormat = (updates.eventFormat as "online" | "offline" | undefined) ?? existing.eventFormat ?? "offline";
  const effLocation = (updates.location as string | undefined) ?? existing.location ?? "";
  const effVenue = (updates.venue as string | undefined) ?? existing.venue ?? "";
  const effMeetingLink = (updates.meetingLink as string | undefined) ?? existing.meetingLink ?? "";
  if (effFormat === "online") {
    if (!effMeetingLink.trim()) {
      return NextResponse.json({ error: "Meeting link is required for online events" }, { status: 400 });
    }
  } else {
    if (!effLocation.trim()) {
      return NextResponse.json({ error: "Location is required for offline events" }, { status: 400 });
    }
    if (!effVenue.trim()) {
      return NextResponse.json({ error: "Venue is required for offline events" }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const unsetFields: Record<string, 1> = {};
  if (updates.eventFormat === "offline") {
    unsetFields.meetingLink = 1;
    unsetFields.meetingDetails = 1;
    unsetFields.meetingPlatform = 1;
  }
  if (updates.eventFormat === "online") {
    unsetFields.venue = 1;
    unsetFields.location = 1;
  }

  const updateOp: Record<string, unknown> = { $set: updates };
  if (Object.keys(unsetFields).length > 0) updateOp.$unset = unsetFields;
  await EventModel.findByIdAndUpdate(eventId, updateOp).exec();
  return NextResponse.json(updates);
}
