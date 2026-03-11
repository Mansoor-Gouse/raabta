import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, GroupModel } from "@/lib/db";

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
  await GroupModel.findByIdAndUpdate(groupId, { $pull: { memberIds: session.userId } }).exec();
  return NextResponse.json({ left: true });
}
