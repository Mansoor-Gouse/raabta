import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, CircleRelationshipModel, NotificationModel } from "@/lib/db";
import { sendPushToUserAsync } from "@/lib/pushSend";

export async function POST(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { caption, mediaUrls, visibility } = body as {
    caption?: string;
    mediaUrls?: string[];
    visibility?: "network" | "inner_circle" | "trusted_circle";
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
    visibility === "inner_circle" || visibility === "trusted_circle" ? visibility : "network";
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
  const authorName = p.authorId?.fullName || p.authorId?.name || "Someone";
  const postIdStr = String(p._id);
  const bodySnippet = typeof p.caption === "string" && p.caption.trim()
    ? p.caption.trim().slice(0, 80) + (p.caption.length > 80 ? "…" : "")
    : "";
  void (async () => {
    try {
      const authorId = new mongoose.Types.ObjectId(session.userId);
      const rows = await CircleRelationshipModel.find({ relatedUserId: authorId })
        .select("userId")
        .limit(100)
        .lean()
        .exec();
      const recipientIds = [...new Set((rows as unknown as { userId: mongoose.Types.ObjectId }[]).map((r) => String(r.userId)))].filter(
        (id) => id !== session.userId
      );
      for (const recipientId of recipientIds) {
        await NotificationModel.create({
          userId: new mongoose.Types.ObjectId(recipientId),
          type: "new_post",
          postId: post._id,
          actorId: authorId,
        });
        sendPushToUserAsync(recipientId, {
          title: `${authorName} posted`,
          body: bodySnippet,
          url: `/app/feed/${postIdStr}`,
        });
      }
    } catch (err) {
      console.error("[posts] new_post notifications", err);
    }
  })();
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
