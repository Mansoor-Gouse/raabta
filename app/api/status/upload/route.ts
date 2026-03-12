import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadBuffer } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file || !file.size) return NextResponse.json({ error: "file required" }, { status: 400 });

  const rawType = file.type?.toLowerCase() ?? "";
  let type: "image" | "video" | null =
    rawType.startsWith("video/") ? "video" : rawType.startsWith("image/") ? "image" : null;
  if (!type) {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    const videoExts = ["mp4", "webm", "mov", "quicktime", "m4v"];
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
    if (videoExts.includes(ext)) type = "video";
    else if (imageExts.includes(ext)) type = "image";
  }
  if (!type) return NextResponse.json({ error: "File must be image or video" }, { status: 400 });

  const ext = type === "video" ? (file.name.split(".").pop() || "mp4") : (file.name.split(".").pop() || "jpg");
  const name = `${randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();
  try {
    const mediaUrl = await uploadBuffer(Buffer.from(bytes), name, "status");
    return NextResponse.json({ mediaUrl, type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    if (message.includes("Blob storage is required")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    throw err;
  }
}
