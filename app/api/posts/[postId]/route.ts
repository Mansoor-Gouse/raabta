import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, PostLikeModel, PostSaveModel, PostCommentModel } from "@/lib/db";

export async function GET(
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
  const post = await PostModel.findById(postId)
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const p = post as unknown as {
    _id: mongoose.Types.ObjectId;
    authorId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string };
    mediaUrls: string[];
    caption?: string;
    visibility?: string;
    createdAt: Date;
  };
  const [likeCount, commentCount, likedByMe, savedByMe] = await Promise.all([
    PostLikeModel.countDocuments({ postId }).exec(),
    PostCommentModel.countDocuments({ postId }).exec(),
    PostLikeModel.exists({ postId, userId: session.userId }).exec(),
    PostSaveModel.exists({ postId, userId: session.userId }).exec(),
  ]);
  return NextResponse.json({
    _id: String(p._id),
    authorId: String(p.authorId._id),
    authorName: p.authorId.fullName || p.authorId.name || "Someone",
    authorImage: p.authorId.profileImage || p.authorId.image,
    mediaUrls: p.mediaUrls,
    caption: p.caption,
    visibility: p.visibility,
    createdAt: p.createdAt,
    likeCount,
    commentCount,
    likedByMe: !!likedByMe,
    savedByMe: !!savedByMe,
  });
}

async function toPostJson(
  post: { _id: mongoose.Types.ObjectId; authorId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string }; mediaUrls: string[]; caption?: string; visibility?: string; createdAt: Date },
  likeCount: number,
  commentCount: number,
  likedByMe: boolean,
  savedByMe: boolean
) {
  const p = post;
  return {
    _id: String(p._id),
    authorId: String(p.authorId._id),
    authorName: p.authorId.fullName || p.authorId.name || "Someone",
    authorImage: p.authorId.profileImage || p.authorId.image,
    mediaUrls: p.mediaUrls,
    caption: p.caption,
    visibility: p.visibility,
    createdAt: p.createdAt,
    likeCount,
    commentCount,
    likedByMe,
    savedByMe,
  };
}

export async function PATCH(
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
  const body = await request.json().catch(() => ({})) as { caption?: string; visibility?: string };
  await connectDB();
  const post = await PostModel.findById(postId).exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (String(post.authorId) !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (typeof body.caption === "string") (post as { caption?: string }).caption = body.caption;
  if (body.visibility === "network" || body.visibility === "inner_circle" || body.visibility === "trusted_circle") {
    (post as { visibility?: string }).visibility = body.visibility;
  }
  await post.save();
  const populated = await PostModel.findById(postId)
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();
  const [likeCount, commentCount, likedByMe, savedByMe] = await Promise.all([
    PostLikeModel.countDocuments({ postId }).exec(),
    PostCommentModel.countDocuments({ postId }).exec(),
    PostLikeModel.exists({ postId, userId: session.userId }).exec(),
    PostSaveModel.exists({ postId, userId: session.userId }).exec(),
  ]);
  return NextResponse.json(
    await toPostJson(
      populated as unknown as Parameters<typeof toPostJson>[0],
      likeCount,
      commentCount,
      !!likedByMe,
      !!savedByMe
    )
  );
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
  const post = await PostModel.findById(postId).exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (String(post.authorId) !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new mongoose.Types.ObjectId(postId);
  await Promise.all([
    PostLikeModel.deleteMany({ postId: id }).exec(),
    PostSaveModel.deleteMany({ postId: id }).exec(),
    PostCommentModel.deleteMany({ postId: id }).exec(),
  ]);
  await PostModel.deleteOne({ _id: id }).exec();
  return new NextResponse(null, { status: 204 });
}
