import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, StarredMessageModel } from "@/lib/db";
import { getStreamServerClient } from "@/lib/stream-server";

type StarredRow = {
  _id: unknown;
  userId: string;
  channelId: string;
  messageId: string;
  channelType?: "messaging" | "team";
  senderId?: string;
  senderName?: string;
  textPreview?: string;
  createdAt?: string;
};

async function resolveMessageDetails(
  row: StarredRow
): Promise<{
  channelType?: "messaging" | "team";
  senderId?: string;
  senderName?: string;
  textPreview?: string;
} | null> {
  const serverClient = getStreamServerClient();
  if (!serverClient) return null;

  const channelTypesToTry: Array<"messaging" | "team"> = row.channelType
    ? [row.channelType]
    : ["messaging", "team"];

  for (const channelType of channelTypesToTry) {
    try {
      const channel = serverClient.channel(channelType, row.channelId);
      const state = await channel.query({
        messages: { id_around: row.messageId, limit: 1 },
        watch: false,
        state: true,
        presence: false,
      });
      const msg = state.messages?.find((m) => m.id === row.messageId);
      if (!msg) continue;

      return {
        channelType,
        senderId: msg.user?.id,
        senderName: (msg.user?.name as string | undefined) ?? msg.user?.id,
        textPreview: typeof msg.text === "string" ? msg.text.slice(0, 280) : undefined,
      };
    } catch {
      // Try next channel type.
    }
  }
  return null;
}

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const rows = (await StarredMessageModel.find({ userId: session.userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec()) as unknown as StarredRow[];

  const candidates = rows.filter(
    (row) => !row.channelType || !row.senderName || !row.textPreview
  );
  if (candidates.length === 0) return NextResponse.json({ starred: rows });

  const candidatesToEnrich = candidates.slice(0, 20);
  const enriched = await Promise.all(
    candidatesToEnrich.map(async (row) => {
      const details = await resolveMessageDetails(row);
      if (!details) return null;
      const patch: Partial<StarredRow> = {};
      if (!row.channelType && details.channelType) patch.channelType = details.channelType;
      if (!row.senderId && details.senderId) patch.senderId = details.senderId;
      if (!row.senderName && details.senderName) patch.senderName = details.senderName;
      if (!row.textPreview && details.textPreview) patch.textPreview = details.textPreview;
      if (Object.keys(patch).length === 0) return null;

      await StarredMessageModel.updateOne(
        { _id: row._id },
        { $set: patch }
      );
      return { rowId: String(row._id), patch };
    })
  );

  const patchById = new Map(
    enriched
      .filter((v): v is { rowId: string; patch: Partial<StarredRow> } => !!v)
      .map((v) => [v.rowId, v.patch])
  );
  const hydratedRows = rows.map((row) => ({
    ...row,
    ...(patchById.get(String(row._id)) ?? {}),
  }));
  return NextResponse.json({ starred: hydratedRows });
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

