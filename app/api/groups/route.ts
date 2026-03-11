import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, GroupModel } from "@/lib/db";
import { createOrGetChannel, upsertStreamUser } from "@/lib/stream-server";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  await connectDB();
  const query: Record<string, unknown> = {};
  if (type && ["interest", "city", "event"].includes(type)) query.type = type;
  const groups = await GroupModel.find(query).sort({ name: 1 }).lean().exec();
  const list = groups.map((g) => {
    const gr = g as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      description?: string;
      type: string;
      channelId: string;
      memberIds: mongoose.Types.ObjectId[];
    };
    const isMember = gr.memberIds.some((id) => String(id) === session.userId);
    return {
      _id: String(gr._id),
      name: gr.name,
      description: gr.description,
      type: gr.type,
      channelId: gr.channelId,
      memberCount: gr.memberIds.length,
      isMember,
    };
  });
  return NextResponse.json({ groups: list });
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { name, description, type } = body as { name?: string; description?: string; type?: string };
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const groupType = type && ["interest", "city", "event"].includes(type) ? type : "interest";
  await connectDB();
  await upsertStreamUser(session.userId, {});
  const group = await GroupModel.create({
    name: name.trim(),
    description: typeof description === "string" ? description.trim() : undefined,
    type: groupType,
    channelId: `group-${new mongoose.Types.ObjectId()}`,
    memberIds: [session.userId],
  });
  const created = await createOrGetChannel(group.channelId, {
    name: group.name,
    members: [session.userId],
  });
  if (!created) {
    await GroupModel.findByIdAndDelete(group._id).exec();
    return NextResponse.json({ error: "Could not create chat channel" }, { status: 503 });
  }
  const gr = await GroupModel.findById(group._id).lean().exec();
  const g = gr as unknown as {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    type: string;
    channelId: string;
    memberIds: mongoose.Types.ObjectId[];
  };
  return NextResponse.json({
    _id: String(g._id),
    name: g.name,
    description: g.description,
    type: g.type,
    channelId: g.channelId,
    memberCount: g.memberIds.length,
    isMember: true,
  });
}
