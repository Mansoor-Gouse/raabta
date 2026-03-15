import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, NotificationModel, EventModel, User } from "@/lib/db";
import mongoose from "mongoose";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const cursor = searchParams.get("cursor");
  await connectDB();
  const baseQuery: { userId: mongoose.Types.ObjectId; createdAt?: { $lt: Date }; readAt?: null } = {
    userId: new mongoose.Types.ObjectId(session.userId),
  };
  const unreadCount = await NotificationModel.countDocuments({ ...baseQuery, readAt: null }).exec();
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    const doc = await NotificationModel.findOne({
      _id: new mongoose.Types.ObjectId(cursor),
      userId: session.userId,
    })
      .select("createdAt")
      .lean()
      .exec();
    if (doc) baseQuery.createdAt = { $lt: (doc as unknown as { createdAt: Date }).createdAt };
  }
  const docs = await NotificationModel.find(baseQuery)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean()
    .exec();
  const hasMore = docs.length > limit;
  const list = (hasMore ? docs.slice(0, limit) : docs) as unknown as { _id: mongoose.Types.ObjectId; type: string; eventId?: mongoose.Types.ObjectId; postId?: mongoose.Types.ObjectId; statusId?: mongoose.Types.ObjectId; actorId?: mongoose.Types.ObjectId; readAt?: Date; createdAt: Date }[];
  const eventIds = [...new Set(list.map((n) => n.eventId).filter(Boolean).map((id) => String(id!)))];
  const actorIds = [...new Set(list.map((n) => n.actorId).filter(Boolean).map((id) => String(id!)))];
  const [events, actors] = await Promise.all([
    eventIds.length > 0
      ? EventModel.find({ _id: { $in: eventIds.map((id) => new mongoose.Types.ObjectId(id)) } })
          .select("title")
          .lean()
          .exec()
      : [],
    actorIds.length > 0
      ? User.find({ _id: { $in: actorIds.map((id) => new mongoose.Types.ObjectId(id)) } })
          .select("fullName name")
          .lean()
          .exec()
      : [],
  ]);
  const eventMap = new Map(
    (events as unknown as { _id: mongoose.Types.ObjectId; title: string }[]).map((e) => [String(e._id), e.title])
  );
  const actorMap = new Map(
    (actors as unknown as { _id: mongoose.Types.ObjectId; fullName?: string; name?: string }[]).map((a) => [
      String(a._id),
      a.fullName || a.name || "Someone",
    ])
  );
  const items = list.map((n) => ({
    _id: String(n._id),
    type: n.type,
    eventId: n.eventId ? String(n.eventId) : null,
    eventTitle: n.eventId ? (eventMap.get(String(n.eventId)) ?? null) : null,
    postId: n.postId ? String(n.postId) : null,
    statusId: n.statusId ? String(n.statusId) : null,
    actorId: n.actorId ? String(n.actorId) : null,
    actorName: n.actorId ? (actorMap.get(String(n.actorId)) ?? null) : null,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: (n as { createdAt: Date }).createdAt.toISOString(),
  }));
  const nextCursor = hasMore && list.length > 0 ? String(list[list.length - 1]._id) : null;
  return NextResponse.json({
    notifications: items,
    unreadCount,
    nextCursor,
    hasMore,
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = (body as { action?: string }).action;
  if (action === "markAllRead") {
    await connectDB();
    await NotificationModel.updateMany(
      { userId: new mongoose.Types.ObjectId(session.userId), readAt: null },
      { $set: { readAt: new Date() } }
    ).exec();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
