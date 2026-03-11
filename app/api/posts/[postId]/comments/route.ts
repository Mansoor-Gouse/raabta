import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, PostCommentModel, PostCommentLikeModel } from "@/lib/db";

const COMMENTS_PAGE = 50;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId } = await params;
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const parentIdParam = searchParams.get("parentId");
  await connectDB();
  const post = await PostModel.findById(postId).exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const postObjId = new mongoose.Types.ObjectId(postId);
  const baseMatch: Record<string, unknown> = { postId: postObjId };
  if (parentIdParam && mongoose.Types.ObjectId.isValid(parentIdParam)) {
    (baseMatch as Record<string, unknown>).parentId = new mongoose.Types.ObjectId(parentIdParam);
  } else {
    (baseMatch as Record<string, unknown>).$or = [{ parentId: null }, { parentId: { $exists: false } }];
  }
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    (baseMatch as Record<string, unknown>)._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  const comments = await PostCommentModel.find(baseMatch as mongoose.FilterQuery<{ postId: mongoose.Types.ObjectId }>)
    .sort({ createdAt: -1 })
    .limit(COMMENTS_PAGE + 1)
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();

  const hasMore = comments.length > COMMENTS_PAGE;
  const list = hasMore ? comments.slice(0, COMMENTS_PAGE) : comments;
  const nextCursor =
    hasMore && list.length > 0
      ? String((list[list.length - 1] as { _id: mongoose.Types.ObjectId })._id)
      : null;

  const commentIds = list.map((c) => (c as { _id: mongoose.Types.ObjectId })._id);
  const [likeCounts, likedCommentIds, replyCounts] = await Promise.all([
    PostCommentLikeModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { commentId: { $in: commentIds } } },
      { $group: { _id: "$commentId", count: { $sum: 1 } } },
    ]).exec(),
    PostCommentLikeModel.find({
      commentId: { $in: commentIds },
      userId: new mongoose.Types.ObjectId(session.userId),
    })
      .distinct("commentId")
      .exec(),
    !parentIdParam && commentIds.length > 0
      ? PostCommentModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
          { $match: { parentId: { $in: commentIds } } },
          { $group: { _id: "$parentId", count: { $sum: 1 } } },
        ]).exec()
      : [],
  ]);
  const likeCountMap = new Map(likeCounts.map((x) => [String(x._id), x.count]));
  const likedSet = new Set(likedCommentIds.map(String));
  const replyCountMap = new Map(replyCounts.map((x) => [String(x._id), x.count]));

  const items = list.map((c) => {
    const com = c as unknown as {
      _id: mongoose.Types.ObjectId;
      authorId: {
        _id: mongoose.Types.ObjectId;
        fullName?: string;
        name?: string;
        profileImage?: string;
        image?: string;
      };
      text: string;
      createdAt: Date;
    };
    const author = com.authorId as { fullName?: string; name?: string; profileImage?: string; image?: string };
    const idStr = String(com._id);
    const item: Record<string, unknown> = {
      _id: idStr,
      authorId: String(com.authorId._id),
      authorName: author?.fullName || author?.name || "Someone",
      authorImage: author?.profileImage || author?.image,
      text: com.text,
      createdAt: com.createdAt,
      likeCount: likeCountMap.get(idStr) ?? 0,
      likedByMe: likedSet.has(idStr),
    };
    if (!parentIdParam) {
      item.replyCount = replyCountMap.get(idStr) ?? 0;
    }
    return item;
  });

  return NextResponse.json({ comments: items, nextCursor });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId } = await params;
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }
  const body = (await request.json()) as { text?: string; parentId?: string };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Comment text required" }, { status: 400 });
  }
  await connectDB();
  const post = await PostModel.findById(postId).exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  let parentId: mongoose.Types.ObjectId | undefined;
  if (body.parentId && mongoose.Types.ObjectId.isValid(body.parentId)) {
    const parent = await PostCommentModel.findOne({
      _id: body.parentId,
      postId: new mongoose.Types.ObjectId(postId),
      $or: [{ parentId: null }, { parentId: { $exists: false } }],
    })
      .lean()
      .exec();
    if (!parent) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
    }
    parentId = new mongoose.Types.ObjectId(body.parentId);
  }
  const comment = await PostCommentModel.create({
    postId,
    authorId: session.userId,
    text,
    ...(parentId && { parentId }),
  });
  const populated = await PostCommentModel.findById(comment._id)
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();
  const c = populated as unknown as {
    _id: mongoose.Types.ObjectId;
    authorId: { fullName?: string; name?: string; profileImage?: string; image?: string };
    text: string;
    createdAt: Date;
  };
  const author = c.authorId as { fullName?: string; name?: string; profileImage?: string; image?: string };
  const payload: Record<string, unknown> = {
    _id: String(c._id),
    authorId: session.userId,
    authorName: author?.fullName || author?.name || "Someone",
    authorImage: author?.profileImage || author?.image,
    text: c.text,
    createdAt: c.createdAt,
  };
  if (parentId) payload.parentId = String(parentId);
  return NextResponse.json(payload);
}
