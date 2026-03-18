import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { AnonymousHandleModel, connectDB } from "@/lib/db";

const COOLDOWN_DAYS = 30;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function normalizeHandle(raw: string) {
  const h = raw.trim().replace(/^u\//i, "");
  const safe = h.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
  return safe;
}

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const doc = await AnonymousHandleModel.findOne({
    userId: new mongoose.Types.ObjectId(session.userId),
  })
    .select("handle createdAt updatedAt")
    .lean()
    .exec();
  const anyDoc = doc as any;
  const lastChangedAt: Date | null = anyDoc?.updatedAt || anyDoc?.createdAt || null;
  const canChangeAt = lastChangedAt ? new Date(lastChangedAt.getTime() + COOLDOWN_MS) : null;
  const cooldownRemainingMs = canChangeAt ? Math.max(0, canChangeAt.getTime() - Date.now()) : 0;
  return NextResponse.json({
    handle: anyDoc?.handle ?? null,
    createdAt: anyDoc?.createdAt ? (anyDoc.createdAt as Date).toISOString() : null,
    updatedAt: anyDoc?.updatedAt ? (anyDoc.updatedAt as Date).toISOString() : null,
    canChangeAt: canChangeAt ? canChangeAt.toISOString() : null,
    cooldownRemainingSeconds: Math.floor(cooldownRemainingMs / 1000),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const handleRaw = (body as any)?.handle as string | undefined;
  if (typeof handleRaw !== "string") {
    return NextResponse.json({ error: "Handle is required." }, { status: 400 });
  }
  const handle = normalizeHandle(handleRaw);
  if (!handle || handle.length < 3) {
    return NextResponse.json({ error: "Handle must be at least 3 characters." }, { status: 400 });
  }

  await connectDB();
  const userId = new mongoose.Types.ObjectId(session.userId);

  try {
    const existing = await AnonymousHandleModel.findOne({ userId })
      .select("createdAt updatedAt")
      .lean()
      .exec();
    if (existing) {
      const anyExisting = existing as any;
      const lastChangedAt: Date = (anyExisting.updatedAt || anyExisting.createdAt) as Date;
      const canChangeAt = new Date(lastChangedAt.getTime() + COOLDOWN_MS);
      const remainingMs = canChangeAt.getTime() - Date.now();
      if (remainingMs > 0) {
        return NextResponse.json(
          {
            error: `You can change your handle once every ${COOLDOWN_DAYS} days.`,
            canChangeAt: canChangeAt.toISOString(),
            cooldownRemainingSeconds: Math.floor(remainingMs / 1000),
          },
          { status: 429 }
        );
      }
    }

    const doc = await AnonymousHandleModel.findOneAndUpdate(
      { userId },
      { $set: { handle } },
      { upsert: true, new: true }
    )
      .select("handle createdAt updatedAt")
      .lean()
      .exec();
    const anyDoc = doc as any;
    const lastChangedAt: Date | null = anyDoc?.updatedAt || anyDoc?.createdAt || null;
    const canChangeAt = lastChangedAt ? new Date(lastChangedAt.getTime() + COOLDOWN_MS) : null;
    const cooldownRemainingMs = canChangeAt ? Math.max(0, canChangeAt.getTime() - Date.now()) : 0;
    return NextResponse.json({
      handle: anyDoc?.handle ?? handle,
      canChangeAt: canChangeAt ? canChangeAt.toISOString() : null,
      cooldownRemainingSeconds: Math.floor(cooldownRemainingMs / 1000),
    });
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "";
    if (message.includes("duplicate key")) {
      return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save handle." }, { status: 500 });
  }
}

