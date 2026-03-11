import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, StatusModel, StatusReactionModel } from "@/lib/db";

const ALLOWED_REACTIONS = ["heart", "fire", "laugh", "cry", "wow", "like"] as const;

export async function POST(
  request: NextRequest,
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
  let body: { reactionType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const reactionType = body.reactionType;
  if (
    !reactionType ||
    typeof reactionType !== "string" ||
    !ALLOWED_REACTIONS.includes(reactionType as (typeof ALLOWED_REACTIONS)[number])
  ) {
    return NextResponse.json(
      { error: "reactionType must be one of: " + ALLOWED_REACTIONS.join(", ") },
      { status: 400 }
    );
  }
  try {
    await connectDB();
    const status = await StatusModel.findById(statusId).lean();
    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }
    if (new Date((status as unknown as { expiresAt: Date }).expiresAt) <= new Date()) {
      return NextResponse.json({ error: "Status expired" }, { status: 410 });
    }
    const userId = new mongoose.Types.ObjectId(session.userId);
    const statusIdObj = new mongoose.Types.ObjectId(statusId);
    await StatusReactionModel.findOneAndUpdate(
      { statusId: statusIdObj, userId },
      { reactionType, createdAt: new Date() },
      { upsert: true, new: true }
    );
    return NextResponse.json({ ok: true, reactionType });
  } catch (e) {
    console.error("status react", e);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const userId = new mongoose.Types.ObjectId(session.userId);
    await StatusReactionModel.deleteOne({
      statusId: new mongoose.Types.ObjectId(statusId),
      userId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("status unreact", e);
    return NextResponse.json(
      { error: "Failed to remove reaction" },
      { status: 500 }
    );
  }
}
