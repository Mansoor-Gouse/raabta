import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, StatusModel, StatusViewModel, StatusReactionModel } from "@/lib/db";

function viewerDisplayName(u: { fullName?: string; name?: string; phone?: string }): string {
  if (u.fullName && u.fullName.trim()) return u.fullName.trim();
  if (u.name && u.name.trim()) return u.name.trim();
  if (u.phone && String(u.phone).length >= 4) return `***${String(u.phone).slice(-4)}`;
  return "Someone";
}

export async function GET(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const now = new Date();
    const { searchParams } = new URL(request.url);
    const statusIdParam = searchParams.get("statusId");
    let ids: mongoose.Types.ObjectId[];
    if (statusIdParam && mongoose.Types.ObjectId.isValid(statusIdParam)) {
      const status = await StatusModel.findOne({
        _id: new mongoose.Types.ObjectId(statusIdParam),
        userId: new mongoose.Types.ObjectId(session.userId),
        expiresAt: { $gt: now },
      })
        .select("_id")
        .lean();
      ids = status ? [(status as { _id: mongoose.Types.ObjectId })._id] : [];
    } else {
      const myStatusIds = await StatusModel.find({
        userId: new mongoose.Types.ObjectId(session.userId),
        expiresAt: { $gt: now },
      })
        .select("_id")
        .lean();
      ids = myStatusIds.map((s) => (s as { _id: mongoose.Types.ObjectId })._id);
    }
    if (ids.length === 0) {
      return NextResponse.json({ viewers: [], reactions: [] });
    }
    const [views, reactions] = await Promise.all([
      StatusViewModel.find({ statusId: { $in: ids } })
        .sort({ viewedAt: -1 })
        .populate("viewerId", "name image fullName profileImage phone")
        .lean(),
      StatusReactionModel.find({ statusId: { $in: ids } })
        .sort({ createdAt: -1 })
        .populate("userId", "name image fullName profileImage phone")
        .lean(),
    ]);
    const viewers = views.map((v) => {
      const vw = v as unknown as {
        statusId: mongoose.Types.ObjectId;
        viewerId: {
          _id: string;
          name?: string;
          fullName?: string;
          image?: string;
          profileImage?: string;
          phone?: string;
        };
        viewedAt: Date;
      };
      return {
        statusId: String(vw.statusId),
        viewerId: String(vw.viewerId._id),
        viewerName: viewerDisplayName(vw.viewerId),
        viewerImage: vw.viewerId.profileImage || vw.viewerId.image,
        viewedAt: vw.viewedAt,
      };
    });
    const reactionsList = reactions.map((r) => {
      const rr = r as unknown as {
        statusId: mongoose.Types.ObjectId;
        userId: {
          _id: string;
          name?: string;
          fullName?: string;
          image?: string;
          profileImage?: string;
          phone?: string;
        };
        reactionType: string;
        createdAt: Date;
      };
      return {
        statusId: String(rr.statusId),
        userId: String(rr.userId._id),
        userName: viewerDisplayName(rr.userId),
        userImage: rr.userId.profileImage || rr.userId.image,
        reactionType: rr.reactionType,
        createdAt: rr.createdAt,
      };
    });
    return NextResponse.json({ viewers, reactions: reactionsList });
  } catch (e) {
    console.error("status-viewers", e);
    return NextResponse.json(
      { error: "Failed to list viewers" },
      { status: 500 }
    );
  }
}
