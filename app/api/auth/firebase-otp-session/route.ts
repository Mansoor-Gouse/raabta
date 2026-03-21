import { NextRequest, NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, name: nameFromBody } = body as {
      idToken?: string;
      name?: string;
    };

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const phoneRaw = decoded.phone_number;
    if (!phoneRaw || typeof phoneRaw !== "string") {
      return NextResponse.json(
        { error: "Phone not available from token" },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phoneRaw);
    if (normalized.length !== 10) {
      return NextResponse.json(
        { error: "Invalid phone number on token" },
        { status: 400 }
      );
    }

    await connectDB();
    let user = await User.findOne({ phone: normalized });
    if (!user) {
      user = await User.create({ phone: normalized });
    }
    const needsName = !user.fullName && !user.name;
    const nameToSet =
      typeof nameFromBody === "string" ? nameFromBody.trim() : "";
    if (needsName && nameToSet) {
      user = await User.findByIdAndUpdate(
        user._id,
        { $set: { name: nameToSet, fullName: nameToSet } },
        { new: true }
      ).exec();
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 500 });
      }
    }
    const displayName = user.fullName || user.name;
    await createSession(
      user._id.toString(),
      normalized,
      displayName,
      user.image
    );
    return NextResponse.json({
      ok: true,
      needsName: !user.fullName && !user.name,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name ?? user.fullName,
        image: user.image,
      },
    });
  } catch (e) {
    console.error("firebase-otp-session", e);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
