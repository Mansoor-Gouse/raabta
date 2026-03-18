import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, QaAnswerVoteModel, AnswerModel } from "@/lib/db";

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
  const value = (body as any)?.value as 1 | 0 | -1;
  if (![1, 0, -1].includes(value)) {
    return NextResponse.json({ error: "Invalid vote value." }, { status: 400 });
  }

  await connectDB();

  const answerId = new mongoose.Types.ObjectId(id);
  const userId = new mongoose.Types.ObjectId(session.userId);

  async function applyVote() {
    const existing = await QaAnswerVoteModel.findOne({ answerId, userId }).exec();
    const prev = existing ? (existing.value as 1 | -1) : 0;
    const next = value === 0 ? 0 : (value as 1 | -1);
    const delta = next - prev;

    if (existing && next === 0) {
      await QaAnswerVoteModel.deleteOne({ _id: existing._id }).exec();
    } else if (existing && next !== 0) {
      await QaAnswerVoteModel.updateOne({ _id: existing._id }, { $set: { value: next } }).exec();
    } else if (!existing && next !== 0) {
      await QaAnswerVoteModel.create({ answerId, userId, value: next });
    }

    if (delta !== 0) {
      await AnswerModel.updateOne(
        { _id: answerId },
        {
          $inc: {
            score: delta,
            upvoteCount: next === 1 && prev !== 1 ? 1 : prev === 1 && next !== 1 ? -1 : 0,
            downvoteCount: next === -1 && prev !== -1 ? 1 : prev === -1 && next !== -1 ? -1 : 0,
          },
        }
      ).exec();
    }

    const updated = await AnswerModel.findById(answerId).select("score").lean().exec();
    return { myVote: next, score: (updated as any)?.score ?? 0 };
  }

  try {
    const sessionTxn = await mongoose.startSession();
    try {
      let result: { myVote: number; score: number } | null = null;
      await sessionTxn.withTransaction(async () => {
        result = await applyVote();
      });
      return NextResponse.json(result ?? { myVote: value, score: 0 });
    } finally {
      sessionTxn.endSession();
    }
  } catch {
    const result = await applyVote();
    return NextResponse.json(result);
  }
}

