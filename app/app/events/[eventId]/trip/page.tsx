import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, EventModel } from "@/lib/db";
import mongoose from "mongoose";
import { EliteTripClient } from "./EliteTripClient";

export default async function EventTripPage({
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
    title: string;
    type: string;
    category?: string;
    visibility?: string;
    startAt: Date;
    hostId: mongoose.Types.ObjectId;
  };
  const isHost = String(ev.hostId) === String(session.userId);
  if (!isHost) notFound();
  /** Trip module is disabled for invite-only (private) events */
  const isTripType = ev.type === "trip" || ev.category === "luxury-trips";
  if (!isTripType || ev.visibility === "invite-only") notFound();
  return (
    <EliteTripClient
      eventId={eventId}
      eventTitle={ev.title}
      eventDate={ev.startAt.toISOString()}
      isHost={isHost}
    />
  );
}
