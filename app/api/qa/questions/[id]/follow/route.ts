import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, QuestionModel, QuestionFollowModel } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { action } = body as { action?: "follow" | "unfollow" };

  await connectDB();

  const exists = await QuestionModel.exists({ _id: new mongoose.Types.ObjectId(id) }).exec();
  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const questionId = new mongoose.Types.ObjectId(id);
  const userId = new mongoose.Types.ObjectId(session.userId);

  if (action === "unfollow") {
    await QuestionFollowModel.deleteOne({ questionId, userId }).exec();
    await QuestionModel.updateOne(
      { _id: questionId },
      { $inc: { followerCount: -1 } }
    ).exec();
    return NextResponse.json({ following: false });
  }

  const res = await QuestionFollowModel.updateOne(
    { questionId, userId },
    {
      $setOnInsert: {
        notifyOnNewAnswer: true,
        notifyOnSolution: true,
      },
    },
    { upsert: true }
  ).exec();

  if (res.upsertedCount && res.upsertedCount > 0) {
    await QuestionModel.updateOne(
      { _id: questionId },
      { $inc: { followerCount: 1 } }
    ).exec();
  }

  return NextResponse.json({ following: true });
}

