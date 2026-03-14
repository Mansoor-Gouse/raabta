import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, PostLikeModel } from "@/lib/db";

export type LikesListEntry = {
  userId: string;
  userName: string;
  userImage?: string | null;
};

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
  const post = await PostModel.findById(postId).select("_id").lean().exec();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const likes = await PostLikeModel.find({ postId })
    .sort({ createdAt: -1 })
    .populate("userId", "fullName name profileImage image")
    .lean()
    .exec();

  const list: LikesListEntry[] = likes.map((row) => {
    const u = (row as unknown as { userId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string } }).userId;
    if (!u || typeof u !== "object") {
      return { userId: "", userName: "Unknown", userImage: null };
    }
    const id = typeof u._id !== "undefined" ? String(u._id) : "";
    const name = u.fullName || u.name || "Unknown";
    const img = u.profileImage ?? u.image ?? null;
    return { userId: id, userName: name, userImage: img };
  }).filter((x) => x.userId);

  return NextResponse.json({ likes: list });
}
