import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { upsertStreamUser } from "@/lib/stream-server";

/**
 * Ensure a user exists in Stream before creating a channel with them.
 * Accepts either MongoDB user id or phone number (digits only, 10+ chars).
 * Returns the Stream user id (MongoDB _id) to use as channel member.
 */
export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { memberIdOrPhone } = body as { memberIdOrPhone?: string };
    if (!memberIdOrPhone || typeof memberIdOrPhone !== "string") {
      return NextResponse.json(
        { error: "memberIdOrPhone required" },
        { status: 400 }
      );
    }
    const trimmed = memberIdOrPhone.trim();
    if (trimmed === session.userId) {
      return NextResponse.json(
        { error: "Cannot start chat with yourself" },
        { status: 400 }
      );
    }

    await connectDB();

    function normalizePhone(phone: string) {
      return phone.replace(/\D/g, "").slice(-10);
    }
    const digitsOnly = trimmed.replace(/\D/g, "");
    const isPhone = digitsOnly.length >= 10 && digitsOnly.length <= 15;
    // Relax typing here because Mongoose model uses broad generics and .lean() returns a plain object.
    // We only care that the result has _id, name, image fields.
    let targetUser: any = null;

    if (isPhone) {
      const phoneNorm = normalizePhone(trimmed);
      targetUser = await User.findOne(
        { phone: phoneNorm },
        { _id: 1, name: 1, image: 1 }
      ).lean();
    }
    if (!targetUser) {
      try {
        targetUser = await User.findById(trimmed, {
          _id: 1,
          name: 1,
          image: 1,
        }).lean();
      } catch {
        // invalid id
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found. They must sign up first." },
        { status: 404 }
      );
    }

    const streamUserId = String(targetUser._id);
    const ok = await upsertStreamUser(streamUserId, {
      name: targetUser.name,
      image: targetUser.image,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Could not prepare chat. Try again." },
        { status: 503 }
      );
    }

    return NextResponse.json({ streamUserId });
  } catch (e) {
    console.error("ensure-user", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
