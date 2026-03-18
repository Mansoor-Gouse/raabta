import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, QuestionModel } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof (body as any)?.title === "string" ? (body as any).title.trim() : "";
  const details = typeof (body as any)?.body === "string" ? (body as any).body.trim() : "";

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (title.length > 160) return NextResponse.json({ error: "Title is too long." }, { status: 400 });
  if (details.length > 4000) return NextResponse.json({ error: "Details are too long." }, { status: 400 });

  await connectDB();

  const q = await QuestionModel.findById(id).exec();
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(q.askedByUserId) !== String(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  q.title = title;
  q.body = details || undefined;
  await q.save();

  return NextResponse.json({
    id: String(q._id),
    title: q.title,
    body: q.body ?? "",
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectDB();
  const q = await QuestionModel.findById(id).exec();
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(q.askedByUserId) !== String(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  q.status = "archived";
  await q.save();

  return NextResponse.json({ archived: true });
}

