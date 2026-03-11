import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, User, EventModel, PostModel } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [], events: [], posts: [] });
  }
  await connectDB();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const results: { users: unknown[]; events: unknown[]; posts: unknown[] } = {
    users: [],
    events: [],
    posts: [],
  };
  if (!type || type === "users") {
    const users = await User.find({
      $or: [
        { fullName: regex },
        { name: regex },
        { headline: regex },
        { location: regex },
      ],
    })
      .select("fullName name profileImage image headline location")
      .limit(limit)
      .lean()
      .exec();
    results.users = users.map((u) => {
      const us = u as { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string; headline?: string; location?: string };
      return {
        _id: String(us._id),
        fullName: us.fullName,
        name: us.name,
        profileImage: us.profileImage || us.image,
        headline: us.headline,
        location: us.location,
      };
    });
  }
  if (!type || type === "events") {
    const events = await EventModel.find({
      $or: [{ title: regex }, { description: regex }, { location: regex }],
      startAt: { $gte: new Date() },
    })
      .sort({ startAt: 1 })
      .limit(limit)
      .populate("hostId", "fullName name")
      .lean()
      .exec();
    results.events = events.map((e) => {
      const ev = e as unknown as {
        _id: mongoose.Types.ObjectId;
        title: string;
        location?: string;
        startAt: Date;
        type: string;
      };
      return {
        _id: String(ev._id),
        title: ev.title,
        location: ev.location,
        startAt: ev.startAt,
        type: ev.type,
      };
    });
  }
  if (!type || type === "posts") {
    const posts = await PostModel.find({
      $or: [{ caption: regex }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("authorId", "fullName name profileImage image")
      .lean()
      .exec();
    results.posts = posts.map((p) => {
      const po = p as unknown as {
        _id: mongoose.Types.ObjectId;
        caption?: string;
        mediaUrls: string[];
        authorId: { fullName?: string; name?: string };
        createdAt: Date;
      };
      return {
        _id: String(po._id),
        caption: po.caption,
        mediaUrls: po.mediaUrls,
        authorName: po.authorId?.fullName || po.authorId?.name,
        createdAt: po.createdAt,
      };
    });
  }
  return NextResponse.json(results);
}
