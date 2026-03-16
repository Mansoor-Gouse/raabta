import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  QuestionModel,
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
  const sort = searchParams.get("sort") ?? "latest"; // latest | unanswered
  const cursor = searchParams.get("cursor");

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

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    const cursorDoc = await QuestionModel.findById(cursor).select("createdAt").lean().exec();
    const anyCursor = cursorDoc as any;
    if (anyCursor?.createdAt) {
      (query as { createdAt?: { $lt: Date } }).createdAt = { $lt: anyCursor.createdAt as Date };
    }
  }

  const docs = await QuestionModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean()
    .exec();

  const hasMore = docs.length > limit;
  const list = hasMore ? docs.slice(0, limit) : docs;

  return NextResponse.json({
    questions: list.map((qRaw) => {
      const q = qRaw as any;
      return {
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

