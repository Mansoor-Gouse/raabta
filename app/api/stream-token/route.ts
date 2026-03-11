import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createStreamToken } from "@/lib/stream-server";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = createStreamToken(session.userId);
  if (!token) {
    return NextResponse.json(
      { error: "Stream not configured" },
      { status: 503 }
    );
  }
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || "";
  return NextResponse.json({
    token,
    apiKey,
    userId: session.userId,
    name: session.name || session.phone,
    image: session.image,
  });
}
