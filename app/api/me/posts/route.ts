import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, PostModel } from "@/lib/db";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
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
