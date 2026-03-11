import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, StatusModel, StatusViewModel, StatusReactionModel } from "@/lib/db";

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
    const status = await StatusModel.findById(statusId).lean();
    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }
    const statusObj = status as unknown as { userId: mongoose.Types.ObjectId };
    if (String(statusObj.userId) !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const id = new mongoose.Types.ObjectId(statusId);
    await Promise.all([
      StatusModel.deleteOne({ _id: id }),
      StatusViewModel.deleteMany({ statusId: id }),
      StatusReactionModel.deleteMany({ statusId: id }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("status delete", e);
    return NextResponse.json(
      { error: "Failed to delete status" },
      { status: 500 }
    );
  }
}
