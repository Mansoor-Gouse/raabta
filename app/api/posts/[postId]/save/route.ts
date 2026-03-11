import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, PostSaveModel } from "@/lib/db";

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
  await PostSaveModel.findOneAndUpdate(
    { postId, userId: session.userId },
    { $setOnInsert: { postId, userId: session.userId } },
    { upsert: true, new: true }
  ).exec();
  return NextResponse.json({ saved: true });
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
  await PostSaveModel.deleteOne({ postId, userId: session.userId }).exec();
  return NextResponse.json({ saved: false });
}
