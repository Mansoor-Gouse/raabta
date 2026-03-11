import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, CircleRelationshipModel } from "@/lib/db";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const myId = new mongoose.Types.ObjectId(session.userId);
  const [innerCount, trustedCount] = await Promise.all([
    CircleRelationshipModel.countDocuments({ userId: myId, circleType: "INNER" }).exec(),
    CircleRelationshipModel.countDocuments({ userId: myId, circleType: "TRUSTED" }).exec(),
  ]);
  return NextResponse.json({ inner: innerCount, trusted: trustedCount });
}
