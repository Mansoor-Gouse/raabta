import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, StatusModel, StatusViewModel } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ statusId: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { statusId } = await params;
  if (!statusId || !mongoose.Types.ObjectId.isValid(statusId)) {
    return NextResponse.json({ error: "Invalid status id" }, { status: 400 });
  }
  try {
    await connectDB();
    const status = await StatusModel.findById(statusId).lean();
    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }
    const statusObj = status as unknown as {
      userId: mongoose.Types.ObjectId;
      expiresAt: Date;
    };
    if (String(statusObj.userId) === session.userId) {
      return NextResponse.json({ error: "Cannot record view on own story" }, { status: 400 });
    }
    if (new Date(statusObj.expiresAt) <= new Date()) {
      return NextResponse.json({ error: "Status expired" }, { status: 410 });
    }
    const viewerId = new mongoose.Types.ObjectId(session.userId);
    const statusIdObj = new mongoose.Types.ObjectId(statusId);
    await StatusViewModel.findOneAndUpdate(
      { statusId: statusIdObj, viewerId },
      { viewedAt: new Date() },
      { upsert: true, new: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("status view", e);
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 }
    );
  }
}
