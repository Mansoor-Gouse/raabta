import { NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  await connectDB();
  const user = await User.findById(id)
    .select(
      "fullName headline bio location profileImage bannerImage industries interests languages preferredDestinations isVerified verificationLevel name image createdAt"
    )
    .lean()
    .exec();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}
