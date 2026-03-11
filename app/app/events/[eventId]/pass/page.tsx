import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDisplayName } from "@/lib/displayName";
import { connectDB, EventModel, EventAttendeeModel, User } from "@/lib/db";
import mongoose from "mongoose";
import { EliteEventPassClient } from "./EliteEventPassClient";

export default async function EventPassPage({
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
    _id: mongoose.Types.ObjectId;
    title: string;
    location?: string;
    startAt: Date;
  };
  const attendance = await EventAttendeeModel.findOne({
    eventId,
    userId: session.userId,
    status: { $in: ["going", "accepted"] },
  }).lean().exec();
  if (!attendance) notFound();
  const att = attendance as { vipTag?: boolean };
  const user = await User.findById(session.userId).select("fullName name phone").lean().exec();
  const name = getDisplayName(user as { fullName?: string; name?: string; phone?: string } | null);
  return (
    <EliteEventPassClient
      eventId={eventId}
      eventTitle={ev.title}
      eventLocation={ev.location}
      eventDate={ev.startAt.toISOString()}
      userName={name}
      vipTag={att.vipTag ?? false}
    />
  );
}
