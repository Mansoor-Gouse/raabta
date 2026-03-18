import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  QuestionModel,
  AnswerModel,
  QaQuestionVoteModel,
  AnonymousHandleModel,
  User,
  QuestionSaveModel,
  type QuestionStatus,
  type QuestionContextType,
} from "@/lib/db";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
    MAX_LIMIT
  );
  const status = (searchParams.get("status") as QuestionStatus | null) ?? null;
  const contextType = (searchParams.get("contextType") as QuestionContextType | null) ?? null;
  const contextId = searchParams.get("contextId");
  const sort = searchParams.get("sort") ?? "new"; // hot | new | top | unanswered (legacy)
  const cursor = searchParams.get("cursor");
  const savedOnly = searchParams.get("saved") === "1";
  const window = searchParams.get("window") ?? "all"; // for top: today|week|month|all

  await connectDB();

  const query: Record<string, unknown> = {};
  if (status && ["open", "resolved", "archived"].includes(status)) {
    query.status = status;
  } else {
    query.status = { $ne: "archived" };
  }
  if (contextType && contextType !== "none") {
    query.contextType = contextType;
    if (contextId && mongoose.Types.ObjectId.isValid(contextId)) {
      query.contextId = new mongoose.Types.ObjectId(contextId);
    }
  }

  if (sort === "unanswered") {
    query.answerCount = 0;
  }

  if (savedOnly) {
    const saved = await QuestionSaveModel.find({
      userId: new mongoose.Types.ObjectId(session.userId),
    })
      .select("questionId")
      .lean()
      .exec();
    const ids = (saved as any[]).map((s) => s.questionId as mongoose.Types.ObjectId);
    query._id = { $in: ids.length > 0 ? ids : [new mongoose.Types.ObjectId("000000000000000000000000")] };
  }

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    const cursorDoc = await QuestionModel.findById(cursor).select("createdAt").lean().exec();
    const anyCursor = cursorDoc as any;
    if (anyCursor?.createdAt) {
      (query as { createdAt?: { $lt: Date } }).createdAt = { $lt: anyCursor.createdAt as Date };
    }
  }

  if (sort === "top" && window !== "all") {
    const now = new Date();
    const since =
      window === "today"
        ? new Date(now.getTime() - 24 * 3600 * 1000)
        : window === "week"
          ? new Date(now.getTime() - 7 * 24 * 3600 * 1000)
          : window === "month"
            ? new Date(now.getTime() - 30 * 24 * 3600 * 1000)
            : null;
    if (since) (query as any).createdAt = { ...(query as any).createdAt, $gte: since };
  }

  const docs =
    sort === "hot"
      ? await QuestionModel.aggregate([
          { $match: query as any },
          {
            $addFields: {
              __ageHours: {
                $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60],
              },
            },
          },
          {
            $addFields: {
              __hot: {
                $divide: [
                  "$score",
                  { $pow: [{ $add: ["$__ageHours", 2] }, 1.5] },
                ],
              },
            },
          },
          { $sort: { __hot: -1, createdAt: -1 } },
          { $limit: limit + 1 },
        ]).exec()
      : await QuestionModel.find(query)
          .sort(sort === "top" ? { score: -1, createdAt: -1 } : { createdAt: -1 })
          .limit(limit + 1)
          .lean()
          .exec();

  const hasMore = docs.length > limit;
  const list = hasMore ? docs.slice(0, limit) : docs;

  const userId = new mongoose.Types.ObjectId(session.userId);
  const questionIds = list.map((q) => (q as any)._id as mongoose.Types.ObjectId);
  const myVotes =
    questionIds.length > 0
      ? await QaQuestionVoteModel.find({ userId, questionId: { $in: questionIds } })
          .select("questionId value")
          .lean()
          .exec()
      : [];
  const myVoteById = new Map<string, 1 | -1>();
  for (const v of myVotes as any[]) {
    myVoteById.set(String(v.questionId), v.value as 1 | -1);
  }

  const savedRows =
    questionIds.length > 0
      ? await QuestionSaveModel.find({ userId, questionId: { $in: questionIds } })
          .select("questionId")
          .lean()
          .exec()
      : [];
  const savedSet = new Set<string>((savedRows as any[]).map((r) => String(r.questionId)));

  const askerIds = Array.from(
    new Set(list.map((q) => String((q as any).askedByUserId)))
  ).filter((x) => mongoose.Types.ObjectId.isValid(x));
  const askerObjectIds = askerIds.map((x) => new mongoose.Types.ObjectId(x));
  const [askers, handles, topCounts] = await Promise.all([
    User.find({ _id: { $in: askerObjectIds } }).select("fullName name").lean().exec(),
    AnonymousHandleModel.find({ userId: { $in: askerObjectIds } })
      .select("userId handle")
      .lean()
      .exec(),
    questionIds.length > 0
      ? AnswerModel.aggregate([
          { $match: { questionId: { $in: questionIds }, parentAnswerId: null } },
          { $group: { _id: "$questionId", count: { $sum: 1 } } },
        ]).exec()
      : Promise.resolve([] as any[]),
  ]);
  const nameByUserId = new Map<string, string>();
  for (const u of askers as any[]) {
    nameByUserId.set(String(u._id), (u.fullName || u.name || "Member") as string);
  }
  const handleByUserId = new Map<string, string>();
  for (const h of handles as any[]) {
    handleByUserId.set(String(h.userId), h.handle as string);
  }
  const topCountByQuestionId = new Map<string, number>();
  for (const row of topCounts as any[]) {
    topCountByQuestionId.set(String(row._id), Number(row.count) || 0);
  }

  return NextResponse.json({
    questions: list.map((qRaw) => {
      const q = qRaw as any;
      const askerId = String(q.askedByUserId);
      const authorLabel = q.isAnonymousToMembers
        ? `u/${handleByUserId.get(askerId) ?? "anonymous"}`
        : nameByUserId.get(askerId) ?? "Member";
      return {
        id: String(q._id),
        title: q.title,
        body: q.body ?? "",
        topics: q.topics ?? [],
        city: q.city ?? null,
        contextType: q.contextType,
        contextId: q.contextId ? String(q.contextId) : null,
        status: q.status,
        answerCount: topCountByQuestionId.get(String(q._id)) ?? (q.answerCount ?? 0),
        followerCount: q.followerCount ?? 0,
        hasAcceptedAnswer: q.hasAcceptedAnswer ?? false,
        isAnonymousToMembers: q.isAnonymousToMembers ?? false,
        score: q.score ?? 0,
        myVote: (myVoteById.get(String(q._id)) ?? 0) as 1 | 0 | -1,
        savedByMe: savedSet.has(String(q._id)),
        authorLabel,
        createdAt: (q.createdAt as Date).toISOString(),
      };
    }),
    hasMore,
    nextCursor: hasMore && list.length > 0 ? String(list[list.length - 1]._id) : null,
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    title,
    details,
    topics,
    city,
    contextType,
    contextId,
    isAnonymousToMembers,
  } = body as {
    title?: string;
    details?: string;
    topics?: string[];
    city?: string;
    contextType?: QuestionContextType;
    contextId?: string | null;
    isAnonymousToMembers?: boolean;
  };

  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  const trimmedBody = typeof details === "string" ? details.trim() : "";
  if (!trimmedTitle) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (trimmedTitle.length > 160) {
    return NextResponse.json({ error: "Title is too long." }, { status: 400 });
  }
  if (trimmedBody.length > 4000) {
    return NextResponse.json({ error: "Details are too long." }, { status: 400 });
  }

  const safeTopics =
    Array.isArray(topics) && topics.length > 0
      ? topics.filter((t): t is string => typeof t === "string").slice(0, 8)
      : [];
  const safeCity = typeof city === "string" ? city.trim() || undefined : undefined;
  const safeContextType: QuestionContextType =
    contextType && ["none", "event", "trip", "retreat", "umrah", "hajj", "profile"].includes(contextType)
      ? contextType
      : "none";
  const safeContextId =
    contextId && mongoose.Types.ObjectId.isValid(contextId)
      ? new mongoose.Types.ObjectId(contextId)
      : undefined;

  await connectDB();

  const doc = await QuestionModel.create({
    title: trimmedTitle,
    body: trimmedBody || undefined,
    topics: safeTopics,
    city: safeCity,
    contextType: safeContextType,
    contextId: safeContextId,
    askedByUserId: new mongoose.Types.ObjectId(session.userId),
    isAnonymousToMembers: Boolean(isAnonymousToMembers),
  });

  return NextResponse.json(
    {
      id: String(doc._id),
      title: doc.title,
      body: doc.body ?? "",
      topics: doc.topics ?? [],
      city: doc.city ?? null,
      contextType: doc.contextType,
      contextId: doc.contextId ? String(doc.contextId) : null,
      status: doc.status,
      answerCount: doc.answerCount ?? 0,
      followerCount: doc.followerCount ?? 0,
      hasAcceptedAnswer: doc.hasAcceptedAnswer ?? false,
      isAnonymousToMembers: doc.isAnonymousToMembers ?? false,
      createdAt: doc.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

