import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, EventModel } from "@/lib/db";
import mongoose from "mongoose";
import { EliteEventEditClient, type InitialData } from "./EliteEventEditClient";

function toDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default async function EventEditPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) notFound();
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) notFound();
  await connectDB();
  const event = await EventModel.findById(eventId).lean().exec();
  if (!event) notFound();
  const ev = event as unknown as {
    hostId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    location?: string;
    venue?: string;
    startAt: Date;
    endAt?: Date;
    capacity?: number;
    coverImage?: string;
    visibility: string;
    category?: string;
    dressCode?: string;
    etiquette?: string;
    halalMenuDetails?: string;
    prayerFacilityInfo?: string;
    allowGuestRequest?: boolean;
    allowBringGuest?: boolean;
    audienceType?: string;
    eventFormat?: "online" | "offline";
    meetingLink?: string;
    meetingDetails?: string;
    meetingPlatform?: string;
  };
  const isHost = String(ev.hostId) === String(session.userId);
  if (!isHost) notFound();

  const initial = {
    eventId,
    title: ev.title ?? "",
    description: ev.description ?? "",
    location: ev.location ?? "",
    venue: ev.venue ?? "",
    eventFormat: ev.eventFormat === "online" ? "online" : "offline",
    meetingLink: ev.meetingLink ?? "",
    meetingDetails: ev.meetingDetails ?? "",
    meetingPlatform: ev.meetingPlatform ?? "",
    startAt: toDatetimeLocal(ev.startAt?.toISOString?.()),
    endAt: toDatetimeLocal(ev.endAt?.toISOString?.()),
    capacity: ev.capacity ?? undefined,
    coverImage: ev.coverImage ?? "",
    visibility: (ev.visibility === "invite-only" ? "invite-only" : "network") as "network" | "invite-only",
    category: ev.category ?? "",
    dressCode: ev.dressCode ?? "",
    etiquette: ev.etiquette ?? "",
    halalMenuDetails: ev.halalMenuDetails ?? "",
    prayerFacilityInfo: ev.prayerFacilityInfo ?? "",
    allowGuestRequest: ev.allowGuestRequest ?? false,
    allowBringGuest: ev.allowBringGuest ?? false,
    audienceType: ev.audienceType ?? "",
  } as InitialData;

  return <EliteEventEditClient initial={initial} />;
}
