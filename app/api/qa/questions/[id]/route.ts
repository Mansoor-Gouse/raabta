import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  QuestionModel,
  AnswerModel,
  QuestionFollowModel,
  QaQuestionVoteModel,
  QaAnswerVoteModel,
  AnonymousHandleModel,
  User,
  QuestionSaveModel,
} from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectDB();

  const qRaw = await QuestionModel.findById(id).lean().exec();
  if (!qRaw) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const q = qRaw as any;

  const userId = new mongoose.Types.ObjectId(session.userId);

  const [answers, follow, qVote, saved] = await Promise.all([
    AnswerModel.find({ questionId: q._id as mongoose.Types.ObjectId })
      .sort({ createdAt: 1 })
      .lean()
      .exec(),
    QuestionFollowModel.findOne({
      questionId: q._id,
      userId,
    })
      .select("_id")
      .lean()
      .exec(),
    QaQuestionVoteModel.findOne({ questionId: q._id, userId }).select("value").lean().exec(),
    QuestionSaveModel.exists({ questionId: q._id, userId }),
  ]);

  const answerIds = answers.map((a) => (a as any)._id as mongoose.Types.ObjectId);
  const myAnswerVotes =
    answerIds.length > 0
      ? await QaAnswerVoteModel.find({ userId, answerId: { $in: answerIds } })
          .select("answerId value")
          .lean()
          .exec()
      : [];
  const myVoteByAnswerId = new Map<string, 1 | -1>();
  for (const v of myAnswerVotes as any[]) {
    myVoteByAnswerId.set(String(v.answerId), v.value as 1 | -1);
  }

  const askerId = String(q.askedByUserId);
  const answererIds = Array.from(
    new Set(answers.map((a) => String((a as any).answeredByUserId)))
  );
  const allUserIds = Array.from(new Set([askerId, ...answererIds])).filter((x) =>
    mongoose.Types.ObjectId.isValid(x)
  );
  const allObjectIds = allUserIds.map((x) => new mongoose.Types.ObjectId(x));
  const [users, handles] = await Promise.all([
    User.find({ _id: { $in: allObjectIds } }).select("fullName name").lean().exec(),
    AnonymousHandleModel.find({ userId: { $in: allObjectIds } })
      .select("userId handle")
      .lean()
      .exec(),
  ]);
  const nameByUserId = new Map<string, string>();
  for (const u of users as any[]) {
    nameByUserId.set(String(u._id), (u.fullName || u.name || "Member") as string);
  }
  const handleByUserId = new Map<string, string>();
  for (const h of handles as any[]) {
    handleByUserId.set(String(h.userId), h.handle as string);
  }
  const qAuthorLabel = q.isAnonymousToMembers
    ? `u/${handleByUserId.get(askerId) ?? "anonymous"}`
    : nameByUserId.get(askerId) ?? "Member";

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
      score: q.score ?? 0,
      myVote: ((qVote as any)?.value ?? 0) as 1 | 0 | -1,
      createdAt: (q.createdAt as Date).toISOString(),
      askedByUserId: String(q.askedByUserId),
      isFollowing: Boolean(follow),
      authorLabel: qAuthorLabel,
      savedByMe: Boolean(saved),
    },
    answers: answers.map((a) => {
      const anyA = a as any;
      const answererId = String(anyA.answeredByUserId);
      const aAuthorLabel = anyA.isAnonymousToMembers
        ? `u/${handleByUserId.get(answererId) ?? "anonymous"}`
        : nameByUserId.get(answererId) ?? "Member";
      return {
        id: String(anyA._id),
        body: anyA.body,
        isAnonymousToMembers: anyA.isAnonymousToMembers ?? false,
        isAcceptedSolution: anyA.isAcceptedSolution ?? false,
        upvoteCount: anyA.upvoteCount ?? 0,
        score: anyA.score ?? 0,
        myVote: (myVoteByAnswerId.get(String(anyA._id)) ?? 0) as 1 | 0 | -1,
        parentAnswerId: anyA.parentAnswerId ? String(anyA.parentAnswerId) : null,
        answeredByUserId: String(anyA.answeredByUserId),
        authorLabel: aAuthorLabel,
        createdAt: (anyA.createdAt as Date).toISOString(),
      };
    }),
  });
}

