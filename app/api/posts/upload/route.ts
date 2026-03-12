import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadBuffer } from "@/lib/storage";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 10;

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files: File[] = [];
  const file = formData.get("file") as File | null;
  const filesField = formData.getAll("files");
  if (file?.size) {
    files.push(file);
  }
  if (filesField?.length) {
    for (const f of filesField) {
      if (f instanceof File && f.size) files.push(f);
    }
  }
  // Support multiple "file" entries (e.g. multiple inputs named "file")
  const moreFiles = formData.getAll("file");
  for (const f of moreFiles) {
    if (f instanceof File && f.size && !files.includes(f)) files.push(f);
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "At least one file is required" },
      { status: 400 }
    );
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES} files allowed` },
      { status: 400 }
    );
  }

  const mediaUrls: string[] = [];
  const types: ("image" | "video")[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` },
        { status: 400 }
      );
    }
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `File ${file.name} must be image or video` },
        { status: 400 }
      );
    }
    const type = isVideo ? "video" : "image";
    const ext = isVideo
      ? (file.name.split(".").pop() || "mp4")
      : (file.name.split(".").pop() || "jpg");
    const name = `${randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();
    try {
      const url = await uploadBuffer(Buffer.from(bytes), name, "posts");
      mediaUrls.push(url);
      types.push(type);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      if (message.includes("Blob storage is required")) {
        return NextResponse.json(
          { error: message },
          { status: 503 }
        );
      }
      throw err;
    }
  }

  return NextResponse.json({ mediaUrls, types });
}
