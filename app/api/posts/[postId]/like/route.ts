import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, PostLikeModel, NotificationModel, User } from "@/lib/db";
import { sendPushToUserAsync } from "@/lib/pushSend";

export async function POST(
  _request: Request,
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
  await connectDB();
  const post = await PostModel.findById(postId).exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const alreadyLiked = await PostLikeModel.exists({ postId, userId: session.userId }).exec();
  await PostLikeModel.findOneAndUpdate(
    { postId, userId: session.userId },
    { $setOnInsert: { postId, userId: session.userId } },
    { upsert: true, new: true }
  ).exec();
  const likeCount = await PostLikeModel.countDocuments({ postId }).exec();

  const authorId = (post as { authorId: mongoose.Types.ObjectId }).authorId;
  const isNewLike = !alreadyLiked && String(authorId) !== session.userId;
  if (isNewLike) {
    const actor = await User.findById(session.userId).select("fullName name").lean().exec();
    const actorName = (actor as { fullName?: string; name?: string } | null)
      ? ((actor as { fullName?: string; name?: string }).fullName || (actor as { fullName?: string; name?: string }).name || "Someone")
      : "Someone";
    const caption = (post as { caption?: string }).caption;
    const body = typeof caption === "string" && caption.trim() ? caption.trim().slice(0, 80) + (caption.length > 80 ? "…" : "") : "";
    await NotificationModel.create({
      userId: authorId,
      type: "post_like",
      postId: new mongoose.Types.ObjectId(postId),
      actorId: new mongoose.Types.ObjectId(session.userId),
    });
    sendPushToUserAsync(String(authorId), {
      title: `${actorName} liked your post`,
      body,
      url: `/app/feed/${postId}`,
    });
  }

  return NextResponse.json({ liked: true, likeCount });
}

export async function DELETE(
  _request: Request,
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
  await connectDB();
  await PostLikeModel.deleteOne({ postId, userId: session.userId }).exec();
  const likeCount = await PostLikeModel.countDocuments({ postId }).exec();
  return NextResponse.json({ liked: false, likeCount });
}
