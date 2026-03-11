import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostEventConnectionModel } from "@/lib/db";

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
  const list = await PostEventConnectionModel.find({
    eventId,
    userId: session.userId,
  })
    .populate("metUserId", "fullName name profileImage image")
    .lean()
    .exec();
  const connections = list.map((c) => {
    const u = (c as unknown as {
      metUserId: {
        _id: mongoose.Types.ObjectId;
        fullName?: string;
        name?: string;
        profileImage?: string;
        image?: string;
      };
    }).metUserId;
    return {
      metUserId: String(u._id),
      name: u.fullName || u.name || "Member",
      image: u.profileImage || u.image,
      notes: (c as { notes?: string }).notes,
    };
  });
  return NextResponse.json({ connections });
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
  const body = await request.json();
  const metUserId = (body as { metUserId?: string }).metUserId;
  if (!metUserId || !mongoose.Types.ObjectId.isValid(metUserId)) {
    return NextResponse.json({ error: "Invalid metUserId" }, { status: 400 });
  }
  await connectDB();
  await PostEventConnectionModel.findOneAndUpdate(
    { eventId, userId: session.userId, metUserId },
    { $set: { notes: (body as { notes?: string }).notes } },
    { upsert: true, new: true }
  ).exec();
  return NextResponse.json({ ok: true });
}
