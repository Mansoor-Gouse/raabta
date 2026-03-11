import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, CircleRelationshipModel } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as { relatedUserId?: string };
  const { relatedUserId } = body;
  if (!relatedUserId || typeof relatedUserId !== "string") {
    return NextResponse.json({ error: "relatedUserId is required" }, { status: 400 });
  }
  if (relatedUserId === session.userId) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }
  let relatedOid: mongoose.Types.ObjectId;
  try {
    relatedOid = new mongoose.Types.ObjectId(relatedUserId);
  } catch {
    return NextResponse.json({ error: "Invalid relatedUserId" }, { status: 400 });
  }

  await connectDB();

  const myId = new mongoose.Types.ObjectId(session.userId);
  const result = await CircleRelationshipModel.deleteOne({
    userId: myId,
    relatedUserId: relatedOid,
  }).exec();

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Not in your circle" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
