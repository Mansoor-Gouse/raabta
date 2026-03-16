import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  QuestionModel,
  AnswerModel,
  QuestionFollowModel,
  NotificationModel,
} from "@/lib/db";

export async function POST(
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
  const { text, isAnonymousToMembers } = body as {
    text?: string;
    isAnonymousToMembers?: boolean;
  };

  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return NextResponse.json({ error: "Answer text is required." }, { status: 400 });
  }
  if (trimmed.length > 4000) {
    return NextResponse.json({ error: "Answer is too long." }, { status: 400 });
  }

  await connectDB();

  const question = await QuestionModel.findById(id).exec();
  if (!question || question.status === "archived") {
    return NextResponse.json({ error: "Question is not available." }, { status: 404 });
  }

  const answer = await AnswerModel.create({
    questionId: question._id,
    body: trimmed,
    answeredByUserId: new mongoose.Types.ObjectId(session.userId),
    isAnonymousToMembers: Boolean(isAnonymousToMembers),
  });

  await QuestionModel.updateOne(
    { _id: question._id },
    { $inc: { answerCount: 1 } }
  ).exec();

  // Ensure the answerer follows the question
  await QuestionFollowModel.updateOne(
    {
      questionId: question._id,
      userId: new mongoose.Types.ObjectId(session.userId),
    },
    {
      $setOnInsert: {
        notifyOnNewAnswer: true,
        notifyOnSolution: true,
      },
    },
    { upsert: true }
  ).exec();

  // Notify asker and followers (excluding answerer)
  void (async () => {
    try {
      const actorId = new mongoose.Types.ObjectId(session.userId);
      const followers = await QuestionFollowModel.find({
        questionId: question._id,
        notifyOnNewAnswer: true,
      })
        .select("userId")
        .lean()
        .exec();
      const recipientIds = new Set<string>();
      for (const row of followers as unknown as { userId: mongoose.Types.ObjectId }[]) {
        const uid = String(row.userId);
        if (uid !== session.userId) recipientIds.add(uid);
      }
      for (const userId of recipientIds) {
        await NotificationModel.create({
          userId: new mongoose.Types.ObjectId(userId),
          type: "qa_new_answer",
          actorId,
        });
      }
    } catch (err) {
      console.error("[qa] qa_new_answer notifications", err);
    }
  })();

  return NextResponse.json(
    {
      id: String(answer._id),
      body: answer.body,
      isAnonymousToMembers: answer.isAnonymousToMembers ?? false,
      isAcceptedSolution: answer.isAcceptedSolution ?? false,
      upvoteCount: answer.upvoteCount ?? 0,
      answeredByUserId: String(answer.answeredByUserId),
      createdAt: answer.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

