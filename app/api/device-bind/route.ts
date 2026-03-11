import { NextRequest, NextResponse } from "next/server";
import { connectDB, DeviceBinding } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { hashDeviceId, validateDeviceIdFormat } from "@/lib/device-binding";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { deviceId } = body as { deviceId?: string };
    if (!deviceId || !validateDeviceIdFormat(deviceId)) {
      return NextResponse.json(
        { error: "Valid deviceId required (16-512 chars)" },
        { status: 400 }
      );
    }
    await connectDB();
    const hashed = hashDeviceId(deviceId);
    await DeviceBinding.findOneAndUpdate(
      { userId: session.userId, deviceId: hashed },
      { $set: { userId: session.userId, deviceId: hashed } },
      { upsert: true, new: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("device-bind", e);
    return NextResponse.json(
      { error: "Device binding failed" },
      { status: 500 }
    );
  }
}
