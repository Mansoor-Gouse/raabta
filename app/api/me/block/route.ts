import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, BlockModel } from "@/lib/db";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const blocks = await BlockModel.find({ userId: session.userId })
    .select("blockedUserId")
    .lean()
    .exec();
  const blockedIds = blocks.map(
    (b) =>
      (b as unknown as {
        blockedUserId: string;
      }).blockedUserId
  );
  return NextResponse.json({ blockedIds });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const userId = typeof (body as { userId?: string }).userId === "string" ? (body as { userId: string }).userId.trim() : "";
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === session.userId) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  await connectDB();
  await BlockModel.findOneAndUpdate(
    { userId: session.userId, blockedUserId: userId },
    { userId: session.userId, blockedUserId: userId },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true });
}
