import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, PostLikeModel, PostSaveModel, PostCommentModel, CircleRelationshipModel } from "@/lib/db";
import mongoose from "mongoose";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  await connectDB();

  const myId = new mongoose.Types.ObjectId(session.userId);

  const [myInnerMemberIds, authorsWhoHaveMeInInner, authorsWhoHaveMeInTrusted] = await Promise.all([
    CircleRelationshipModel.find({ userId: myId, circleType: "INNER" })
      .select("relatedUserId")
      .lean()
      .exec()
      .then((rows) => new Set(rows.map((r) => String((r as unknown as { relatedUserId: mongoose.Types.ObjectId }).relatedUserId)))),
    CircleRelationshipModel.find({ relatedUserId: myId, circleType: "INNER" })
      .select("userId")
      .lean()
      .exec()
      .then((rows) => new Set(rows.map((r) => String((r as unknown as { userId: mongoose.Types.ObjectId }).userId)))),
    CircleRelationshipModel.find({ relatedUserId: myId, circleType: "TRUSTED" })
      .select("userId")
      .lean()
      .exec()
      .then((rows) => new Set(rows.map((r) => String((r as unknown as { userId: mongoose.Types.ObjectId }).userId)))),
  ]);

  const innerAuthorIds = [...authorsWhoHaveMeInInner].map((id) => new mongoose.Types.ObjectId(id));
  const trustedAuthorIds = [...authorsWhoHaveMeInTrusted].map((id) => new mongoose.Types.ObjectId(id));

  const query: Record<string, unknown> = {
    $or: [
      { visibility: "network" },
      ...(innerAuthorIds.length > 0
        ? [{ visibility: "inner_circle", authorId: { $in: innerAuthorIds } }]
        : []),
      ...(trustedAuthorIds.length > 0
        ? [{ visibility: "trusted_circle", authorId: { $in: trustedAuthorIds } }]
        : []),
    ],
  };
  const options: { limit: number; sort: { createdAt: -1 }; skip?: number } = {
    limit: PAGE_SIZE + 1,
    sort: { createdAt: -1 },
  };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    const cursorDoc = await PostModel.findById(cursor).select("createdAt").lean();
    if (cursorDoc) {
      (query as { createdAt?: { $lt: Date } }).createdAt = {
        $lt: (cursorDoc as unknown as { createdAt: Date }).createdAt,
      };
    }
  }

  const posts = await PostModel.find(query)
    .sort(options.sort)
    .limit(options.limit)
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();

  const hasMore = posts.length > PAGE_SIZE;
  let list = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  list = (list as unknown as { _id: mongoose.Types.ObjectId; authorId: { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId; createdAt: Date }[]).sort((a, b) => {
    const aId = String(typeof a.authorId === "object" && a.authorId && "_id" in a.authorId ? a.authorId._id : a.authorId);
    const bId = String(typeof b.authorId === "object" && b.authorId && "_id" in b.authorId ? b.authorId._id : b.authorId);
    const aInner = myInnerMemberIds.has(aId) || authorsWhoHaveMeInInner.has(aId);
    const bInner = myInnerMemberIds.has(bId) || authorsWhoHaveMeInInner.has(bId);
    if (aInner && !bInner) return -1;
    if (!aInner && bInner) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) as unknown as typeof list;
  const nextCursor = hasMore && list.length > 0
    ? String((list[list.length - 1] as unknown as { _id: mongoose.Types.ObjectId })._id)
    : null;

  const postIds = list.map((p) => (p as unknown as { _id: mongoose.Types.ObjectId })._id);
  const [likes, saves] = await Promise.all([
    PostLikeModel.find({ postId: { $in: postIds }, userId: session.userId })
      .select("postId")
      .lean()
      .exec(),
    PostSaveModel.find({ postId: { $in: postIds }, userId: session.userId })
      .select("postId")
      .lean()
      .exec(),
  ]);
  const likedSet = new Set(
    likes.map(
      (l) =>
        String(
          (l as unknown as {
            postId: mongoose.Types.ObjectId;
          }).postId
        )
    )
  );
  const savedSet = new Set(
    saves.map(
      (s) =>
        String(
          (s as unknown as {
            postId: mongoose.Types.ObjectId;
          }).postId
        )
    )
  );

  const likeCounts = await PostLikeModel.aggregate([
    { $match: { postId: { $in: postIds } } },
    { $group: { _id: "$postId", count: { $sum: 1 } } },
  ]);
  const likeCountMap = new Map(likeCounts.map((c) => [String(c._id), c.count]));

  const commentCounts = await PostCommentModel.aggregate([
    { $match: { postId: { $in: postIds } } },
    { $group: { _id: "$postId", count: { $sum: 1 } } },
  ]);
  const commentCountMap = new Map(commentCounts.map((c) => [String(c._id), c.count]));

  const items = list.map((p) => {
    const post = p as unknown as {
      _id: mongoose.Types.ObjectId;
      authorId: {
        _id: mongoose.Types.ObjectId;
        fullName?: string;
        name?: string;
        profileImage?: string;
        image?: string;
      };
      mediaUrls: string[];
      caption?: string;
      createdAt: Date;
    };
    const id = String(post._id);
    const author = post.authorId as unknown as { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string };
    const authorIdStr = String(author._id);
    const fromInnerCircle = myInnerMemberIds.has(authorIdStr) || authorsWhoHaveMeInInner.has(authorIdStr);
    const fromTrustedCircle = authorsWhoHaveMeInTrusted.has(authorIdStr);
    return {
      _id: id,
      authorId: authorIdStr,
      authorName: author.fullName || author.name || "Someone",
      authorImage: author.profileImage || author.image,
      mediaUrls: post.mediaUrls,
      caption: post.caption,
      createdAt: post.createdAt,
      likeCount: likeCountMap.get(id) ?? 0,
      commentCount: commentCountMap.get(id) ?? 0,
      likedByMe: likedSet.has(id),
      savedByMe: savedSet.has(id),
      fromInnerCircle,
      fromTrustedCircle: fromTrustedCircle && !fromInnerCircle,
    };
  });

  return NextResponse.json({
    posts: items,
    nextCursor,
  });
}
