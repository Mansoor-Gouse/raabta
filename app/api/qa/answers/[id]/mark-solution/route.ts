import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  AnswerModel,
  QuestionModel,
  QuestionFollowModel,
  NotificationModel,
} from "@/lib/db";

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { mark } = body as { mark?: boolean };
  const shouldMark = mark !== false;

  await connectDB();

  const answer = await AnswerModel.findById(id).exec();
  if (!answer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const question = await QuestionModel.findById(answer.questionId).exec();
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (String(question.askedByUserId) !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (shouldMark) {
    // Unmark any existing accepted answers for this question
    await AnswerModel.updateMany(
      { questionId: question._id, isAcceptedSolution: true },
      { $set: { isAcceptedSolution: false } }
    ).exec();
    await AnswerModel.updateOne(
      { _id: answer._id },
      { $set: { isAcceptedSolution: true } }
    ).exec();
    await QuestionModel.updateOne(
      { _id: question._id },
      { $set: { hasAcceptedAnswer: true, status: "resolved" } }
    ).exec();

    // Notify the answerer and followers who want solution notifications
    void (async () => {
      try {
        const actorId = new mongoose.Types.ObjectId(session.userId);
        const followers = await QuestionFollowModel.find({
          questionId: question._id,
          notifyOnSolution: true,
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
            type: "qa_answer_accepted",
            actorId,
          });
        }
      } catch (err) {
        console.error("[qa] qa_answer_accepted notifications", err);
      }
    })();
  } else {
    await AnswerModel.updateOne(
      { _id: answer._id },
      { $set: { isAcceptedSolution: false } }
    ).exec();
    await QuestionModel.updateOne(
      { _id: question._id },
      { $set: { hasAcceptedAnswer: false, status: "open" } }
    ).exec();
  }

  return NextResponse.json({ ok: true, isAcceptedSolution: shouldMark });
}

