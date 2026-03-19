import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, StarredMessageModel } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { messageId } = await params;
  const channelId = request.nextUrl.searchParams.get("channelId")?.trim() ?? "";
  if (!messageId || !channelId) {
    return NextResponse.json({ error: "messageId and channelId required" }, { status: 400 });
  }
  await connectDB();
  await StarredMessageModel.deleteOne({
    userId: session.userId,
    messageId,
    channelId,
  });
  return NextResponse.json({ ok: true });
}

