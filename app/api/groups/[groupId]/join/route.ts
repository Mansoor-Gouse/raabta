import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, GroupModel, User } from "@/lib/db";
import { addMembersToChannel, upsertStreamUser } from "@/lib/stream-server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }
  await connectDB();
  const group = await GroupModel.findById(groupId).exec();
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  const g = group as { memberIds: mongoose.Types.ObjectId[]; channelId: string };
  if (g.memberIds.some((id) => String(id) === session.userId)) {
    return NextResponse.json({ channelId: g.channelId, alreadyMember: true });
  }
  const user = await User.findById(session.userId).select("name fullName image profileImage").lean().exec();
  const u = user as { name?: string; fullName?: string; image?: string; profileImage?: string } | null;
  await upsertStreamUser(session.userId, { name: u?.fullName || u?.name, image: u?.profileImage || u?.image });
  const added = await addMembersToChannel(g.channelId, [session.userId]);
  if (!added) return NextResponse.json({ error: "Could not join channel" }, { status: 503 });
  await GroupModel.findByIdAndUpdate(groupId, { $addToSet: { memberIds: session.userId } }).exec();
  return NextResponse.json({ channelId: g.channelId });
}
