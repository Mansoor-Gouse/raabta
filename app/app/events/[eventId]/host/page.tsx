import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, EventModel } from "@/lib/db";
import mongoose from "mongoose";
import { EliteHostDashboardClient } from "./EliteHostDashboardClient";

export default async function EventHostPage({
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
    status?: string;
    type?: string;
    category?: string;
    visibility?: string;
  };
  if (String(ev.hostId) !== String(session.userId)) notFound();
  const showTripModule =
    (ev.type === "trip" || ev.category === "luxury-trips") && ev.visibility !== "invite-only";
  return (
    <EliteHostDashboardClient
      eventId={eventId}
      eventTitle={ev.title}
      initialStatus={ev.status ?? "active"}
      showTripModule={showTripModule}
    />
  );
}
