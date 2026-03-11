import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB, ReportModel } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  await connectDB();
  const query: Record<string, string> = {};
  if (status && ["pending", "reviewed", "resolved", "dismissed"].includes(status)) query.status = status;
  const reports = await ReportModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("reporterId", "fullName name")
    .lean()
    .exec();
  const list = reports.map((r) => ({
    _id: (r as unknown as { _id: unknown })._id,
    reporterId: (r as unknown as { reporterId: unknown }).reporterId,
    targetType: (r as unknown as { targetType: string }).targetType,
    targetId: (r as unknown as { targetId: string }).targetId,
    reason: (r as unknown as { reason?: string }).reason,
    status: (r as unknown as { status: string }).status,
    createdAt: (r as unknown as { createdAt: Date }).createdAt,
  }));
  return NextResponse.json({ reports: list });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { targetType, targetId, reason } = body as { targetType?: string; targetId?: string; reason?: string };
  if (!targetType || !["post", "event", "user", "message", "channel"].includes(targetType) || !targetId) {
    return NextResponse.json({ error: "targetType (post|event|user|message|channel) and targetId required" }, { status: 400 });
  }
  await connectDB();
  const report = await ReportModel.create({
    reporterId: session.userId,
    targetType,
    targetId: String(targetId).trim(),
    reason: typeof reason === "string" ? reason.trim() : undefined,
  });
  return NextResponse.json({ _id: report._id, status: "pending" });
}
