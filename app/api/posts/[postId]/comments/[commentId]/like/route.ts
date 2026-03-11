import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostCommentModel, PostCommentLikeModel } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId, commentId } = await params;
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }
  await connectDB();
  const comment = await PostCommentModel.findOne({
    _id: commentId,
    postId: new mongoose.Types.ObjectId(postId),
  })
    .lean()
    .exec();
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  const commentObjId = new mongoose.Types.ObjectId(commentId);
  const userObjId = new mongoose.Types.ObjectId(session.userId);
  await PostCommentLikeModel.findOneAndUpdate(
    { commentId: commentObjId, userId: userObjId },
    { $setOnInsert: { commentId: commentObjId, userId: userObjId } },
    { upsert: true }
  ).exec();
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId, commentId } = await params;
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }
  await connectDB();
  const comment = await PostCommentModel.findOne({
    _id: commentId,
    postId: new mongoose.Types.ObjectId(postId),
  })
    .lean()
    .exec();
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  await PostCommentLikeModel.deleteOne({
    commentId: new mongoose.Types.ObjectId(commentId),
    userId: new mongoose.Types.ObjectId(session.userId),
  }).exec();
  return new NextResponse(null, { status: 204 });
}
