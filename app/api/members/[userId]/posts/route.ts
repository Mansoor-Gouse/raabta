import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, User, CircleRelationshipModel } from "@/lib/db";

function canSeeSection(
  visibility: "everyone" | "trusted_circle" | "inner_circle" | undefined,
  viewerRelation: "inner" | "trusted" | null
): boolean {
  const v = visibility ?? "everyone";
  if (v === "everyone") return true;
  if (v === "trusted_circle") return viewerRelation === "trusted" || viewerRelation === "inner";
  if (v === "inner_circle") return viewerRelation === "inner";
  return false;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId: profileUserId } = await context.params;
  await connectDB();

  const profile = await User.findById(profileUserId)
    .select("profileVisibilityPosts")
    .lean()
    .exec();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const myId = new mongoose.Types.ObjectId(session.userId);
  const profileOid = new mongoose.Types.ObjectId(profileUserId);
  if (profileUserId === session.userId) {
    const posts = await PostModel.find({ authorId: session.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("_id mediaUrls caption")
      .lean()
      .exec();
    return NextResponse.json({
      posts: posts.map((p) => {
        const row = p as unknown as { _id: unknown; mediaUrls: string[]; caption?: string };
        return {
          _id: String(row._id),
          mediaUrls: row.mediaUrls ?? [],
          caption: row.caption ?? undefined,
        };
      }),
    });
  }

  const rel = await CircleRelationshipModel.findOne({
    userId: profileOid,
    relatedUserId: myId,
  })
    .select("circleType")
    .lean()
    .exec();
  const viewerRelation =
    rel && (rel as unknown as { circleType: string }).circleType === "INNER"
      ? "inner"
      : rel && (rel as unknown as { circleType: string }).circleType === "TRUSTED"
        ? "trusted"
        : null;
  const visibility = (profile as unknown as { profileVisibilityPosts?: "everyone" | "trusted_circle" | "inner_circle" })
    .profileVisibilityPosts;
  if (!canSeeSection(visibility, viewerRelation)) {
    return NextResponse.json({ posts: [] });
  }

  const posts = await PostModel.find({ authorId: profileUserId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("_id mediaUrls caption")
    .lean()
    .exec();
  return NextResponse.json({
    posts: posts.map((p) => {
      const row = p as unknown as { _id: unknown; mediaUrls: string[]; caption?: string };
      return {
        _id: String(row._id),
        mediaUrls: row.mediaUrls ?? [],
        caption: row.caption ?? undefined,
      };
    }),
  });
}
