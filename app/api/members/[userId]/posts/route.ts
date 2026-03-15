import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel, User, CircleRelationshipModel } from "@/lib/db";
import { canSeeProfileSection, canSeePostVisibility, type ViewerRelation } from "@/lib/visibility";

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
  const viewerRelation: ViewerRelation =
    rel && (rel as unknown as { circleType: string }).circleType === "INNER"
      ? "inner"
      : rel && (rel as unknown as { circleType: string }).circleType === "TRUSTED"
        ? "trusted"
        : null;
  const profilePostsVisibility = (profile as unknown as { profileVisibilityPosts?: "everyone" | "trusted_circle" | "inner_circle" })
    .profileVisibilityPosts;
  if (!canSeeProfileSection(profilePostsVisibility, viewerRelation)) {
    return NextResponse.json({ posts: [] });
  }

  const posts = await PostModel.find({ authorId: profileUserId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("_id mediaUrls caption visibility")
    .lean()
    .exec();

  type PostRow = { _id: mongoose.Types.ObjectId; mediaUrls?: string[]; caption?: string; visibility?: string };
  const postVisibility = (p: PostRow): "network" | "trusted_circle" | "inner_circle" => {
    const v = p.visibility;
    return v === "inner_circle" || v === "trusted_circle" ? v : "network";
  };
  const rows = posts as unknown as PostRow[];
  const filtered = rows.filter((p) =>
    canSeePostVisibility(postVisibility(p), viewerRelation)
  );

  return NextResponse.json({
    posts: filtered.map((p) => ({
      _id: String(p._id),
      mediaUrls: p.mediaUrls ?? [],
      caption: p.caption ?? undefined,
    })),
  });
}
