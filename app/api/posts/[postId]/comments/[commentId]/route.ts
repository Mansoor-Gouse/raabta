import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostCommentModel, PostCommentLikeModel } from "@/lib/db";

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
    postId,
  })
    .lean()
    .exec();
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  const authorId = String(
    (comment as unknown as { authorId: mongoose.Types.ObjectId }).authorId
  );
  if (authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const commentObjId = new mongoose.Types.ObjectId(commentId);
  const replies = await PostCommentModel.find({ postId, parentId: commentObjId })
    .lean()
    .exec();
  const replyIds = replies.map((r) => (r as { _id: mongoose.Types.ObjectId })._id);
  const allCommentIds = [commentObjId, ...replyIds];
  await PostCommentLikeModel.deleteMany({ commentId: { $in: allCommentIds } }).exec();
  await PostCommentModel.deleteMany({ parentId: commentObjId }).exec();
  await PostCommentModel.deleteOne({ _id: commentId, postId }).exec();
  const deletedCount = 1 + replyIds.length;
  return NextResponse.json({ deleted: deletedCount }, { status: 200 });
}
