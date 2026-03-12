import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel } from "@/lib/db";

export async function POST(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { caption, mediaUrls, visibility } = body as {
    caption?: string;
    mediaUrls?: string[];
    visibility?: "network" | "friends" | "event-attendees" | "inner_circle" | "trusted_circle";
  };
  const urls = Array.isArray(mediaUrls) ? mediaUrls.filter((u): u is string => typeof u === "string") : [];
  const trimmedCaption = typeof caption === "string" ? caption.trim() : "";
  if (!trimmedCaption && urls.length === 0) {
    return NextResponse.json(
      { error: "Post must include text or media." },
      { status: 400 }
    );
  }
  const visibilityValue =
    visibility === "friends" || visibility === "event-attendees" || visibility === "inner_circle" || visibility === "trusted_circle"
      ? visibility
      : "network";
  await connectDB();
  const post = await PostModel.create({
    authorId: session.userId,
    mediaUrls: urls,
    caption: trimmedCaption,
    visibility: visibilityValue,
  });
  const created = await PostModel.findById(post._id)
    .populate("authorId", "fullName name profileImage image")
    .lean()
    .exec();
  const p = created as unknown as {
    _id: unknown;
    authorId: { fullName?: string; name?: string; profileImage?: string; image?: string };
    mediaUrls: string[];
    caption?: string;
    createdAt: Date;
  };
  return NextResponse.json({
    _id: String(p._id),
    authorId: session.userId,
    authorName: p.authorId?.fullName || p.authorId?.name || "Someone",
    authorImage: p.authorId?.profileImage || p.authorId?.image,
    mediaUrls: p.mediaUrls,
    caption: p.caption,
    createdAt: p.createdAt,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    savedByMe: false,
  });
}
