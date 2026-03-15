import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, StatusModel, StatusViewModel, CircleRelationshipModel, NotificationModel, User } from "@/lib/db";
import { sendPushToUserAsync } from "@/lib/pushSend";

const STATUS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const now = new Date();
    const myId = new mongoose.Types.ObjectId(session.userId);
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    const [authorsWhoHaveMeInInner, authorsWhoHaveMeInTrusted] = await Promise.all([
      CircleRelationshipModel.find({ relatedUserId: myId, circleType: "INNER" })
        .select("userId")
        .lean()
        .exec()
        .then((rows) => new Set(rows.map((r) => String((r as unknown as { userId: mongoose.Types.ObjectId }).userId)))),
      CircleRelationshipModel.find({ relatedUserId: myId, circleType: "TRUSTED" })
        .select("userId")
        .lean()
        .exec()
        .then((rows) => new Set(rows.map((r) => String((r as unknown as { userId: mongoose.Types.ObjectId }).userId)))),
    ]);

    const innerAuthorIds = [...authorsWhoHaveMeInInner].map((id) => new mongoose.Types.ObjectId(id));
    const trustedAuthorIds = [...authorsWhoHaveMeInTrusted].map((id) => new mongoose.Types.ObjectId(id));

    const visibilityQuery: Record<string, unknown> = {
      $or: [
        { userId: myId },
        { visibility: "everyone" },
        ...(innerAuthorIds.length > 0 ? [{ visibility: "inner_circle", userId: { $in: innerAuthorIds } }] : []),
        ...(trustedAuthorIds.length > 0 ? [{ visibility: "trusted_circle", userId: { $in: trustedAuthorIds } }] : []),
      ],
    };

    const query: Record<string, unknown> = {
      expiresAt: { $gt: now },
      ...visibilityQuery,
    };
    if (userIdParam && mongoose.Types.ObjectId.isValid(userIdParam)) {
      (query as { userId?: mongoose.Types.ObjectId }).userId = new mongoose.Types.ObjectId(userIdParam);
    }

    const list = await StatusModel.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name image phone")
      .lean();
    const statusIds = list.map(
      (s) =>
        (s as unknown as {
          _id: mongoose.Types.ObjectId;
        })._id
    );
    const viewerId = new mongoose.Types.ObjectId(session.userId);
    const viewedIds = new Set(
      (
        await StatusViewModel.find({
          statusId: { $in: statusIds },
          viewerId,
        }).lean()
      ).map(
        (v) =>
          String(
            (v as unknown as {
              statusId: mongoose.Types.ObjectId;
            }).statusId
          )
      )
    );
    const listWithViewed = list.map((s) => ({
      ...s,
      viewedByMe: viewedIds.has(String((s as { _id: mongoose.Types.ObjectId })._id)),
    }));
    return NextResponse.json({ status: listWithViewed });
  } catch (e) {
    console.error("status list", e);
    return NextResponse.json(
      { error: "Failed to list status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { mediaUrl, type, visibility: visibilityBody, caption } = body as {
      mediaUrl?: string;
      type?: "image" | "video";
      visibility?: "everyone" | "inner_circle" | "trusted_circle";
      caption?: string;
    };
    if (!mediaUrl || !type || !["image", "video"].includes(type)) {
      return NextResponse.json(
        { error: "mediaUrl and type (image|video) required" },
        { status: 400 }
      );
    }
    const visibility =
      visibilityBody === "inner_circle" || visibilityBody === "trusted_circle"
        ? visibilityBody
        : "everyone";
    await connectDB();
    const expiresAt = new Date(Date.now() + STATUS_TTL_MS);
    const authorId = new mongoose.Types.ObjectId(session.userId);
    const created = await StatusModel.create({
      userId: authorId,
      mediaUrl,
      type,
      visibility,
      caption: typeof caption === "string" ? caption.trim().slice(0, 500) : "",
      expiresAt,
    });
    void (async () => {
      try {
        const rows = await CircleRelationshipModel.find({ relatedUserId: authorId })
          .select("userId")
          .limit(100)
          .lean()
          .exec();
        const recipientIds = [...new Set((rows as unknown as { userId: mongoose.Types.ObjectId }[]).map((r) => String(r.userId)))].filter(
          (id) => id !== session.userId
        );
        const author = await User.findById(session.userId).select("fullName name").lean().exec();
        const authorName = (author as { fullName?: string; name?: string } | null)
          ? ((author as { fullName?: string; name?: string }).fullName || (author as { fullName?: string; name?: string }).name || "Someone")
          : "Someone";
        for (const recipientId of recipientIds) {
          await NotificationModel.create({
            userId: new mongoose.Types.ObjectId(recipientId),
            type: "new_story",
            statusId: created._id,
            actorId: authorId,
          });
          sendPushToUserAsync(recipientId, {
            title: `${authorName} posted a story`,
            body: "",
            url: "/app/feed",
          });
        }
      } catch (err) {
        console.error("[status] new_story notifications", err);
      }
    })();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("status create", e);
    return NextResponse.json(
      { error: "Failed to create status" },
      { status: 500 }
    );
  }
}
