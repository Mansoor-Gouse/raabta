import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, BlockModel } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId: blockedUserId } = await params;
  if (!blockedUserId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await connectDB();
  await BlockModel.deleteOne({ userId: session.userId, blockedUserId });
  return NextResponse.json({ ok: true });
}
