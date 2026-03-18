import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, QuestionModel, QuestionSaveModel } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }

  await connectDB();
  const q = await QuestionModel.findById(id).select("_id").lean().exec();
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await QuestionSaveModel.findOneAndUpdate(
    { questionId: id, userId: session.userId },
    { $setOnInsert: { questionId: id, userId: session.userId } },
    { upsert: true, new: true }
  ).exec();

  return NextResponse.json({ saved: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }

  await connectDB();
  await QuestionSaveModel.deleteOne({ questionId: id, userId: session.userId }).exec();
  return NextResponse.json({ saved: false });
}

