import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, StarredMessageModel } from "@/lib/db";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const rows = await StarredMessageModel.find({ userId: session.userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return NextResponse.json({ starred: rows });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    messageId?: string;
    channelId?: string;
    channelType?: "messaging" | "team";
    senderId?: string;
    senderName?: string;
    textPreview?: string;
  } | null;
  const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : "";
  const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";
  const channelType = body?.channelType === "team" ? "team" : body?.channelType === "messaging" ? "messaging" : undefined;
  const senderId = typeof body?.senderId === "string" ? body.senderId.trim() : "";
  const senderName = typeof body?.senderName === "string" ? body.senderName.trim() : "";
  const textPreview = typeof body?.textPreview === "string" ? body.textPreview.trim().slice(0, 280) : "";
  if (!messageId || !channelId) {
    return NextResponse.json({ error: "messageId and channelId required" }, { status: 400 });
  }
  await connectDB();
  await StarredMessageModel.findOneAndUpdate(
    { userId: session.userId, messageId, channelId },
    {
      userId: session.userId,
      messageId,
      channelId,
      ...(channelType ? { channelType } : {}),
      ...(senderId ? { senderId } : {}),
      ...(senderName ? { senderName } : {}),
      ...(textPreview ? { textPreview } : {}),
    },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true });
}

