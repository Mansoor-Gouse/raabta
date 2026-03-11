import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, StatusModel } from "@/lib/db";
import {
  MAX_OVERLAYS_PER_STATUS,
  MAX_OVERLAY_TEXT_LENGTH,
  type TextOverlay,
} from "@/types/status";

const STATUS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

type Visibility = "everyone" | "inner_circle" | "trusted_circle";

function normalizeOverlay(raw: unknown): TextOverlay | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const text = typeof o.text === "string" ? o.text.trim().slice(0, MAX_OVERLAY_TEXT_LENGTH) : "";
  if (!id) return null;
  const x = typeof o.x === "number" ? Math.min(100, Math.max(0, o.x)) : 50;
  const y = typeof o.y === "number" ? Math.min(100, Math.max(0, o.y)) : 50;
  const fontSize = typeof o.fontSize === "number" ? Math.min(72, Math.max(12, o.fontSize)) : 24;
  const fontFamily = typeof o.fontFamily === "string" ? o.fontFamily : "system";
  const color = typeof o.color === "string" ? o.color : "#ffffff";
  const backgroundColor =
    typeof o.backgroundColor === "string" ? o.backgroundColor : undefined;
  const fontWeight =
    o.fontWeight === "bold" ? "bold" : ("normal" as "normal" | "bold");
  const textAlign =
    o.textAlign === "left" || o.textAlign === "center" || o.textAlign === "right"
      ? o.textAlign
      : "center";
  const rotation = typeof o.rotation === "number" ? o.rotation : 0;
  const scale = typeof o.scale === "number" ? Math.min(3, Math.max(0.5, o.scale)) : 1;
  return {
    id,
    text: text || "Text",
    x,
    y,
    fontSize,
    fontFamily,
    color,
    backgroundColor,
    fontWeight,
    textAlign,
    rotation,
    scale,
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    items?: Array<{
      mediaUrl?: string;
      type?: "image" | "video";
      caption?: string;
      textOverlays?: unknown[];
      mediaTransform?: { scale?: number; translateX?: number; translateY?: number };
    }>;
    visibility?: Visibility;
  };

  function normalizeMediaTransform(
    raw: { scale?: number; translateX?: number; translateY?: number } | null | undefined
  ): { scale: number; translateX: number; translateY: number } {
    if (!raw || typeof raw !== "object")
      return { scale: 1, translateX: 0, translateY: 0 };
    const scale = typeof raw.scale === "number" ? Math.min(4, Math.max(0.25, raw.scale)) : 1;
    const translateX = typeof raw.translateX === "number" ? raw.translateX : 0;
    const translateY = typeof raw.translateY === "number" ? raw.translateY : 0;
    return { scale, translateX, translateY };
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }
  if (items.length > 10) {
    return NextResponse.json({ error: "Too many items (max 10)" }, { status: 400 });
  }

  const visibility: Visibility =
    body.visibility === "inner_circle" || body.visibility === "trusted_circle" ? body.visibility : "everyone";

  const normalized = items.map((it) => {
    const rawOverlays = Array.isArray(it.textOverlays) ? it.textOverlays : [];
    const textOverlays = rawOverlays
      .slice(0, MAX_OVERLAYS_PER_STATUS)
      .map(normalizeOverlay)
      .filter((o): o is TextOverlay => o !== null);
    const mediaTransform = normalizeMediaTransform(it.mediaTransform);
    return {
      mediaUrl: it.mediaUrl,
      type: it.type,
      caption: typeof it.caption === "string" ? it.caption.trim().slice(0, 500) : "",
      textOverlays,
      mediaTransform,
    };
  });

  for (const it of normalized) {
    if (!it.mediaUrl || !it.type || (it.type !== "image" && it.type !== "video")) {
      return NextResponse.json(
        { error: "Each item requires mediaUrl and type (image|video)" },
        { status: 400 }
      );
    }
  }

  await connectDB();
  const expiresAt = new Date(Date.now() + STATUS_TTL_MS);
  const userId = new mongoose.Types.ObjectId(session.userId);

  await StatusModel.insertMany(
    normalized.map((it, idx) => ({
      userId,
      mediaUrl: it.mediaUrl,
      type: it.type,
      visibility,
      caption: it.caption,
      textOverlays: it.textOverlays,
      mediaTransform: it.mediaTransform,
      expiresAt,
      createdAt: new Date(Date.now() + idx),
    })),
    { ordered: true }
  );

  return NextResponse.json({ ok: true, count: normalized.length });
}

