import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, NotificationModel } from "@/lib/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }
  await connectDB();
  const updated = await NotificationModel.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), userId: session.userId },
    { $set: { readAt: new Date() } },
    { new: true }
  )
    .lean()
    .exec();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const doc = updated as unknown as { readAt?: Date };
  return NextResponse.json({ ok: true, readAt: doc.readAt?.toISOString() });
}
