import { NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth";
import { connectDB, EventModel, EventAttendeeModel, EventEntryPassModel } from "@/lib/db";

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
  const attendance = await EventAttendeeModel.findOne({
    eventId,
    userId: session.userId,
    status: { $in: ["going", "accepted"] },
  }).lean().exec();
  if (!attendance) {
    return NextResponse.json({ error: "You must accept the invitation to get an event pass" }, { status: 403 });
  }
  let pass = await EventEntryPassModel.findOne({ eventId, userId: session.userId }).lean().exec();
  if (!pass) {
    const token = crypto.randomBytes(24).toString("hex");
    const created = await EventEntryPassModel.create({
      eventId,
      userId: session.userId,
      token,
    });
    pass = await EventEntryPassModel.findById(created._id).lean().exec();
  }
  const p = pass as unknown as { token: string; checkedInAt?: Date };
  return NextResponse.json({ token: p.token, checkedInAt: p.checkedInAt ?? null });
}
