import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, EventModel, EventAttendeeModel, NotificationModel } from "@/lib/db";
import { sendPushToUserAsync } from "@/lib/pushSend";

const REQUEST_LIMIT_PER_WEEK = 5;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }
  const body = await request.json();
  const status = (body as { status?: string; networkingIntent?: string; requestNote?: string }).status;
  const networkingIntent = (body as { networkingIntent?: string }).networkingIntent;
  const requestNote = (body as { requestNote?: string }).requestNote;
  const valid = ["going", "interested", "waitlisted", "declined", "accepted", "request-invite", "invited"] as const;
  let newStatus =
    typeof status === "string" && valid.includes(status as (typeof valid)[number])
      ? status
      : "going";
  const validIntent =
    typeof networkingIntent === "string" &&
    ["business", "philanthropy", "social"].includes(networkingIntent)
      ? networkingIntent
      : undefined;
  await connectDB();
  const event = await EventModel.findById(eventId).lean().exec();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const ev = event as { capacity?: number };
  const goingCount = await EventAttendeeModel.countDocuments({
    eventId,
    status: { $in: ["going", "accepted"] },
  }).exec();
  const atCapacity = ev.capacity != null && ev.capacity > 0 && goingCount >= ev.capacity;

  if (newStatus === "request-invite") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentRequests = await EventAttendeeModel.countDocuments({
      userId: session.userId,
      status: "request-invite",
      createdAt: { $gte: weekAgo },
    }).exec();
    if (recentRequests >= REQUEST_LIMIT_PER_WEEK) {
      return NextResponse.json(
        { error: "Max requests per week reached.", code: "REQUEST_LIMIT" },
        { status: 429 }
      );
    }
    if (atCapacity) {
      newStatus = "waitlisted";
    }
  } else if (newStatus === "going" && atCapacity) {
    newStatus = "waitlisted";
  }

  const update: Record<string, unknown> = { status: newStatus };
  if (validIntent !== undefined) update.networkingIntent = validIntent;
  if ((newStatus === "request-invite" || newStatus === "waitlisted") && typeof requestNote === "string") {
    update.requestNote = requestNote.trim().slice(0, 500);
  }
  await EventAttendeeModel.findOneAndUpdate(
    { eventId, userId: session.userId },
    { $set: update },
    { upsert: true, new: true }
  ).exec();
  if (newStatus === "waitlisted") {
    await NotificationModel.create({
      userId: session.userId,
      type: "event_waitlisted",
      eventId: new mongoose.Types.ObjectId(eventId),
    });
    const ev = event as { title?: string };
    sendPushToUserAsync(String(session.userId), {
      title: "Added to waitlist",
      body: ev.title ?? "You were added to the event waitlist",
      url: `/app/events/${eventId}`,
    });
  }
  const updatedGoingCount = await EventAttendeeModel.countDocuments({
    eventId,
    status: { $in: ["going", "accepted"] },
  }).exec();

  const waitlisted = newStatus === "waitlisted";
  const message = waitlisted
    ? "This event is currently full. You have been added to the waitlist."
    : undefined;
  return NextResponse.json({
    status: newStatus,
    goingCount: updatedGoingCount,
    ...(waitlisted && { waitlisted: true, message }),
  });
}
