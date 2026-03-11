import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, PostLikeModel, PostSaveModel, PostCommentModel } from "@/lib/db";

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  await connectDB();

  const likeQuery: { userId: mongoose.Types.ObjectId; _id?: { $lt: mongoose.Types.ObjectId } } = {
    userId: new mongoose.Types.ObjectId(session.userId),
  };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    likeQuery._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const likes = await PostLikeModel.find(likeQuery)
    .sort({ createdAt: -1 })
    .limit(PAGE_SIZE + 1)
    .lean()
    .exec();

  const hasMore = likes.length > PAGE_SIZE;
  const list = hasMore ? likes.slice(0, PAGE_SIZE) : likes;
  const nextCursor =
    hasMore && list.length > 0
      ? String((list[list.length - 1] as { _id: mongoose.Types.ObjectId })._id)
      : null;

  const postIds = list.map(
    (l) =>
      (l as unknown as {
        postId: mongoose.Types.ObjectId;
      }).postId
  );
  const posts = await PostModel.find({ _id: { $in: postIds } })
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();

  const postMap = new Map(posts.map((p) => [String((p as { _id: mongoose.Types.ObjectId })._id), p]));

  const [likeCounts, commentCounts, savedByUser] = await Promise.all([
    PostLikeModel.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    PostCommentModel.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    PostSaveModel.find({
      postId: { $in: postIds },
      userId: session.userId,
    })
      .select("postId")
      .lean()
      .exec(),
  ]);

  const likeCountMap = new Map(likeCounts.map((c) => [String(c._id), c.count]));
  const commentCountMap = new Map(commentCounts.map((c) => [String(c._id), c.count]));
  const savedSet = new Set(
    savedByUser.map(
      (s) =>
        String(
          (s as unknown as {
            postId: mongoose.Types.ObjectId;
          }).postId
        )
    )
  );

  const items = list.map((l) => {
    const like = l as unknown as { postId: mongoose.Types.ObjectId };
    const id = String(like.postId);
    const post = postMap.get(id) as {
      _id: mongoose.Types.ObjectId;
      authorId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string };
      mediaUrls: string[];
      caption?: string;
      createdAt: Date;
    } | undefined;
    if (!post) {
      return null;
    }
    const author = post.authorId as { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string };
    return {
      _id: id,
      authorId: String(author._id),
      authorName: author?.fullName || author?.name || "Someone",
      authorImage: author?.profileImage || author?.image,
      mediaUrls: post.mediaUrls,
      caption: post.caption,
      createdAt: post.createdAt,
      likeCount: likeCountMap.get(id) ?? 0,
      commentCount: commentCountMap.get(id) ?? 0,
      likedByMe: true,
      savedByMe: savedSet.has(id),
    };
  }).filter(Boolean);

  return NextResponse.json({
    posts: items,
    nextCursor,
  });
}
