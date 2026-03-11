import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDisplayName } from "@/lib/displayName";
import { connectDB, EventModel, EventAttendeeModel } from "@/lib/db";
import mongoose from "mongoose";
import { EliteEventDetailClient } from "@/components/events/elite/EliteEventDetailClient";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) notFound();
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) notFound();
  await connectDB();
  const event = await EventModel.findById(eventId)
    .populate("hostId", "fullName name profileImage image phone")
    .lean()
    .exec();
  if (!event) notFound();
  const ev = event as unknown as {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    hostId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string; phone?: string };
    location?: string;
    venue?: string;
    eventFormat?: "online" | "offline";
    meetingLink?: string;
    meetingDetails?: string;
    meetingPlatform?: string;
    startAt: Date;
    endAt?: Date;
    capacity?: number;
    type: string;
    coverImage?: string;
    visibility: string;
    channelId?: string;
    category?: string;
    dressCode?: string;
    etiquette?: string;
    halalMenuDetails?: string;
    prayerFacilityInfo?: string;
    allowGuestRequest?: boolean;
    allowBringGuest?: boolean;
    status?: string;
    audienceType?: string;
  };
  const hostId = ev.hostId._id;
  const [goingCount, myAttendance, hostEventsCount] = await Promise.all([
    EventAttendeeModel.countDocuments({ eventId, status: { $in: ["going", "accepted"] } }).exec(),
    EventAttendeeModel.findOne({ eventId, userId: session.userId }, { status: 1, vipTag: 1, networkingIntent: 1 }).lean().exec(),
    EventModel.countDocuments({ hostId }).exec(),
  ]);
  const attendees = await EventAttendeeModel.find({ eventId, status: { $in: ["going", "accepted"] } })
    .sort({ createdAt: 1 })
    .limit(20)
    .populate("userId", "fullName name profileImage image phone")
    .lean()
    .exec();
  const myAtt = myAttendance as { status?: string; vipTag?: boolean; networkingIntent?: string } | null;
  const data = {
    _id: eventId,
    title: ev.title,
    description: ev.description,
    hostId: String(ev.hostId._id),
    hostName: getDisplayName(ev.hostId),
    hostImage: ev.hostId.profileImage || ev.hostId.image,
    location: ev.location,
    venue: ev.venue,
    eventFormat: ev.eventFormat ?? "offline",
    meetingLink: ev.meetingLink,
    meetingDetails: ev.meetingDetails,
    meetingPlatform: ev.meetingPlatform,
    startAt: ev.startAt.toISOString(),
    endAt: ev.endAt?.toISOString(),
    capacity: ev.capacity,
    type: ev.type,
    coverImage: ev.coverImage,
    visibility: ev.visibility,
    channelId: ev.channelId,
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
        networkingIntent?: string;
      };
      const u = att.userId;
      return {
        userId: String(u._id),
        name: getDisplayName(u),
        image: u.profileImage || u.image,
        vipTag: att.vipTag ?? false,
        networkingIntent: att.networkingIntent ?? null,
      };
    }),
  };
  const isHost = String(ev.hostId._id) === String(session.userId);
  const detailData = {
    ...data,
    status: (data.status ?? "active") as "active" | "cancelled" | "postponed",
  };
  return <EliteEventDetailClient event={detailData} currentUserId={session.userId} isHost={isHost} />;
}
