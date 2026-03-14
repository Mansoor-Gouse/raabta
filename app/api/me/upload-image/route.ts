import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { uploadBuffer } from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["profile", "banner"] as const;

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file?.size || !type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json(
      { error: "Invalid request: provide file and type (profile or banner)" },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "File must be an image (JPEG, PNG, WebP, etc.)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image must be under 5 MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const name = `${type}-${session.userId}-${randomUUID()}.${safeExt}`;

  try {
    const bytes = await file.arrayBuffer();
    const url = await uploadBuffer(Buffer.from(bytes), name, "profile");
    await connectDB();
    const update = type === "profile" ? { profileImage: url } : { bannerImage: url };
    const user = await User.findByIdAndUpdate(
      session.userId,
      { $set: update },
      { new: true }
    )
      .select("profileImage bannerImage image")
      .lean()
      .exec();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const u = user as { profileImage?: string; bannerImage?: string; image?: string };
    return NextResponse.json({
      profileImage: type === "profile" ? url : u.profileImage || u.image,
      bannerImage: type === "banner" ? url : u.bannerImage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    if (message.includes("Blob storage is required")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
