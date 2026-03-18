import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, AnswerModel, QuestionModel } from "@/lib/db";

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
  const text = typeof (body as any)?.body === "string" ? (body as any).body.trim() : "";
  if (!text) return NextResponse.json({ error: "Reply text is required." }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "Reply is too long." }, { status: 400 });

  await connectDB();
  const a = await AnswerModel.findById(id).exec();
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(a.answeredByUserId) !== String(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  a.body = text;
  await a.save();

  return NextResponse.json({ id: String(a._id), body: a.body });
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
  const a = await AnswerModel.findById(id).exec();
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(a.answeredByUserId) !== String(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const questionId = a.questionId as mongoose.Types.ObjectId;
  const wasAccepted = Boolean(a.isAcceptedSolution);
  await AnswerModel.deleteOne({ _id: a._id }).exec();
  await QuestionModel.updateOne(
    { _id: questionId },
    {
      $inc: { answerCount: -1 },
      ...(wasAccepted ? { $set: { hasAcceptedAnswer: false, status: "open" } } : {}),
    }
  ).exec();

  return NextResponse.json({ deleted: true });
}

