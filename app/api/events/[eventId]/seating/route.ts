import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, EventModel, EventSeatingPlanModel, User } from "@/lib/db";

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
  const plan = await EventSeatingPlanModel.findOne({ eventId }).lean().exec();
  if (!plan) {
    return NextResponse.json({ plan: null, tables: [], assignments: [], myTableId: null });
  }
  const p = plan as unknown as {
    tables: { id: string; name: string; capacity?: number }[];
    assignments: { userId: string; tableId: string }[];
  };
  const myAssign = p.assignments.find((a) => a.userId === String(session.userId));
  const userIds = [...new Set(p.assignments.map((a) => a.userId))];
  const users = userIds.length > 0
    ? await User.find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select("_id fullName name")
        .lean()
        .exec()
    : [];
  const userMap = new Map(users.map((u) => [String((u as { _id: mongoose.Types.ObjectId })._id), (u as { fullName?: string; name?: string }).fullName || (u as { name?: string }).name || "Guest"]));
  const assignmentsWithNames = p.assignments.map((a) => ({
    userId: a.userId,
    tableId: a.tableId,
    name: userMap.get(a.userId) ?? "Guest",
  }));
  return NextResponse.json({
    plan: { tables: p.tables, assignments: assignmentsWithNames },
    tables: p.tables,
    assignments: assignmentsWithNames,
    myTableId: myAssign?.tableId ?? null,
  });
}

export async function POST(
  request: NextRequest,
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
  const ev = event as unknown as { hostId: mongoose.Types.ObjectId };
  if (String(ev.hostId) !== String(session.userId)) {
    return NextResponse.json({ error: "Only the host can update seating" }, { status: 403 });
  }
  const body = await request.json();
  const { tables, assignments } = body as {
    tables?: { id: string; name: string; capacity?: number }[];
    assignments?: { userId: string; tableId: string }[];
  };
  await EventSeatingPlanModel.findOneAndUpdate(
    { eventId },
    {
      $set: {
        tables: Array.isArray(tables) ? tables : [],
        assignments: Array.isArray(assignments) ? assignments : [],
      },
    },
    { upsert: true, new: true }
  ).exec();
  return NextResponse.json({ ok: true });
}
