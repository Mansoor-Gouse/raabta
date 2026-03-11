import { NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";
import { requireAuth, createSession } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findById(session.userId).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const { __v, ...rest } = user as Record<string, unknown>;
  return NextResponse.json(rest);
}

export async function PUT(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const body = await request.json();
  const allowed = [
    "name",
    "fullName",
    "headline",
    "bio",
    "location",
    "profileImage",
    "bannerImage",
    "industries",
    "interests",
    "expertise",
    "concerns",
    "languages",
    "preferredDestinations",
    "company",
    "profession",
    "communityRoles",
  ] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  const user = await User.findByIdAndUpdate(
    session.userId,
    { $set: update },
    { new: true, runValidators: true }
  )
    .lean()
    .exec();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const updated = user as { name?: string; fullName?: string; profileImage?: string; image?: string };
  const nameOrFullNameUpdated = "name" in update || "fullName" in update;
  if (nameOrFullNameUpdated && session.phone) {
    await createSession(
      session.userId,
      session.phone,
      updated.name ?? updated.fullName ?? session.name,
      updated.profileImage ?? updated.image ?? session.image
    );
  }
  const { __v, ...rest } = user as Record<string, unknown>;
  return NextResponse.json(rest);
}
