import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, ReportModel } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reportId } = await params;
  if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }
  const body = await request.json();
  const status = (body as { status?: string }).status;
  if (!status || !["pending", "reviewed", "resolved", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Valid status required" }, { status: 400 });
  }
  await connectDB();
  const report = await ReportModel.findByIdAndUpdate(reportId, { $set: { status } }, { new: true }).lean().exec();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ _id: reportId, status });
}
