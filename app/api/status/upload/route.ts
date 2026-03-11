import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth";
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
  const dir = path.join(process.cwd(), "public", "status");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, name);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const mediaUrl = "/status/" + name;
  return NextResponse.json({ mediaUrl, type });
}
