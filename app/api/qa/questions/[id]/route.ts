import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, QuestionModel, AnswerModel, QuestionFollowModel } from "@/lib/db";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectDB();

  const qRaw = await QuestionModel.findById(id).lean().exec();
  if (!qRaw) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const q = qRaw as any;

  const [answers, follow] = await Promise.all([
    AnswerModel.find({ questionId: q._id as mongoose.Types.ObjectId })
      .sort({ createdAt: 1 })
      .lean()
      .exec(),
    QuestionFollowModel.findOne({
      questionId: q._id,
      userId: new mongoose.Types.ObjectId(session.userId),
    })
      .select("_id")
      .lean()
      .exec(),
  ]);

  return NextResponse.json({
    question: {
      id: String(q._id),
      title: q.title,
      body: q.body ?? "",
      topics: q.topics ?? [],
      city: q.city ?? null,
      contextType: q.contextType,
      contextId: q.contextId ? String(q.contextId) : null,
      status: q.status,
      answerCount: q.answerCount ?? 0,
      followerCount: q.followerCount ?? 0,
      hasAcceptedAnswer: q.hasAcceptedAnswer ?? false,
      isAnonymousToMembers: q.isAnonymousToMembers ?? false,
      createdAt: (q.createdAt as Date).toISOString(),
      askedByUserId: String(q.askedByUserId),
      isFollowing: Boolean(follow),
    },
    answers: answers.map((a) => {
      const anyA = a as any;
      return {
        id: String(anyA._id),
        body: anyA.body,
        isAnonymousToMembers: anyA.isAnonymousToMembers ?? false,
        isAcceptedSolution: anyA.isAcceptedSolution ?? false,
        upvoteCount: anyA.upvoteCount ?? 0,
        answeredByUserId: String(anyA.answeredByUserId),
        createdAt: (anyA.createdAt as Date).toISOString(),
      };
    }),
  });
}

