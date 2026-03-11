import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, CircleRelationshipModel, User } from "@/lib/db";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const myId = new mongoose.Types.ObjectId(session.userId);
  const [innerRows, trustedRows] = await Promise.all([
    CircleRelationshipModel.find({ userId: myId, circleType: "INNER" })
      .populate("relatedUserId", "fullName name profileImage image headline")
      .sort({ createdAt: -1 })
      .lean()
      .exec(),
    CircleRelationshipModel.find({ userId: myId, circleType: "TRUSTED" })
      .populate("relatedUserId", "fullName name profileImage image headline")
      .sort({ createdAt: -1 })
      .lean()
      .exec(),
  ]);

  type PopulatedRow = {
    relatedUserId: { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string; headline?: string };
    reason?: string;
    createdAt: Date;
  };
  const toMember = (r: PopulatedRow) => {
    const u = r.relatedUserId;
    return {
      id: String(u._id),
      fullName: u.fullName,
      name: u.name,
      profileImage: u.profileImage,
      image: u.image,
      headline: u.headline,
      reason: r.reason,
      createdAt: r.createdAt,
    };
  };

  const inner = (innerRows as unknown as PopulatedRow[]).map(toMember);
  const trusted = (trustedRows as unknown as PopulatedRow[]).map(toMember);

  return NextResponse.json({
    inner,
    trusted,
  });
}
