import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, EventModel, EventAttendeeModel } from "@/lib/db";
import mongoose from "mongoose";
import { EliteSeatingClient } from "./EliteSeatingClient";

export default async function EventSeatingPage({
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
  const ev = event as unknown as { title: string; startAt: Date; hostId: mongoose.Types.ObjectId };
  const isHost = String(ev.hostId) === String(session.userId);
  let attendance = await EventAttendeeModel.findOne({
    eventId,
    userId: session.userId,
    status: { $in: ["going", "accepted"] },
  }).lean().exec();
  if (!attendance && isHost) {
    await EventAttendeeModel.findOneAndUpdate(
      { eventId, userId: session.userId },
      { $set: { status: "going" as const } },
      { upsert: true, new: true }
    ).exec();
    attendance = await EventAttendeeModel.findOne({
      eventId,
      userId: session.userId,
      status: { $in: ["going", "accepted"] },
    }).lean().exec();
  }
  if (!attendance && !isHost) notFound();
  return (
    <EliteSeatingClient
      eventId={eventId}
      eventTitle={ev.title}
      eventDate={ev.startAt.toISOString()}
      isHost={isHost}
    />
  );
}
