import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, PostModel, PostCommentModel, PostLikeModel, PostSaveModel, PostCommentLikeModel } from "@/lib/db";
import mongoose from "mongoose";
import { PostDetailClient } from "./PostDetailClient";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) notFound();
  const { postId } = await params;
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) notFound();

  await connectDB();
  const post = await PostModel.findById(postId)
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();
  if (!post) notFound();

  const p = post as unknown as {
    _id: mongoose.Types.ObjectId;
    authorId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string };
    mediaUrls: string[];
    caption?: string;
    createdAt: Date;
  };
  const [likeCount, commentCount, likedByMe, savedByMe] = await Promise.all([
    PostLikeModel.countDocuments({ postId }).exec(),
    PostCommentModel.countDocuments({ postId }).exec(),
    PostLikeModel.exists({ postId, userId: session.userId }).exec(),
    PostSaveModel.exists({ postId, userId: session.userId }).exec(),
  ]);

  const comments = await PostCommentModel.find({
    postId,
    $or: [{ parentId: null }, { parentId: { $exists: false } }],
  })
    .sort({ createdAt: 1 })
    .limit(100)
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();

  const commentIds = comments.map((c) => (c as unknown as { _id: mongoose.Types.ObjectId })._id);
  const [likeCounts, likedCommentIds, replyCounts] = await Promise.all([
    commentIds.length > 0
      ? PostCommentLikeModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
          { $match: { commentId: { $in: commentIds } } },
          { $group: { _id: "$commentId", count: { $sum: 1 } } },
        ]).exec()
      : [],
    commentIds.length > 0
      ? PostCommentLikeModel.find({
          commentId: { $in: commentIds },
          userId: session.userId,
        })
          .distinct("commentId")
          .exec()
      : [],
    commentIds.length > 0
      ? PostCommentModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
          { $match: { parentId: { $in: commentIds } } },
          { $group: { _id: "$parentId", count: { $sum: 1 } } },
        ]).exec()
      : [],
  ]);
  const likeCountMap = new Map(likeCounts.map((x) => [String(x._id), x.count]));
  const likedSet = new Set(likedCommentIds.map(String));
  const replyCountMap = new Map(replyCounts.map((x) => [String(x._id), x.count]));

  const commentList = comments.map((c) => {
    const com = c as unknown as {
      _id: mongoose.Types.ObjectId;
      authorId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string };
      text: string;
      createdAt: Date;
    };
    const author = com.authorId as { fullName?: string; name?: string; profileImage?: string; image?: string };
    const idStr = String(com._id);
    return {
      _id: idStr,
      authorId: String(com.authorId._id),
      authorName: author?.fullName || author?.name || "Member",
      authorImage: author?.profileImage || author?.image,
      text: com.text,
      createdAt: com.createdAt.toISOString(),
      likeCount: likeCountMap.get(idStr) ?? 0,
      likedByMe: likedSet.has(idStr),
      replyCount: replyCountMap.get(idStr) ?? 0,
    };
  });

  const postData = {
    _id: postId,
    authorId: String(p.authorId._id),
    authorName: p.authorId.fullName || p.authorId.name || "Member",
    authorImage: p.authorId.profileImage || p.authorId.image,
    mediaUrls: p.mediaUrls,
    caption: p.caption,
    createdAt: p.createdAt.toISOString(),
    likeCount,
    commentCount,
    likedByMe: !!likedByMe,
    savedByMe: !!savedByMe,
  };

  return (
    <PostDetailClient
      post={postData}
      initialComments={commentList}
      currentUserId={session.userId}
    />
  );
}
