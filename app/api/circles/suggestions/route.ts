import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  CircleRelationshipModel,
  PostEventConnectionModel,
  BlockModel,
  EventAttendeeModel,
  User,
} from "@/lib/db";

const SUGGESTIONS_LIMIT = 20;

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const myId = new mongoose.Types.ObjectId(session.userId);

  const [inCircleIds, blockedIds, metUserIds] = await Promise.all([
    CircleRelationshipModel.find({ userId: myId })
      .select("relatedUserId")
      .lean()
      .exec()
      .then((rows) => rows.map((r) => String((r as unknown as { relatedUserId: mongoose.Types.ObjectId }).relatedUserId))),
    BlockModel.find({ $or: [{ userId: myId }, { blockedUserId: myId }] })
      .select("userId blockedUserId")
      .lean()
      .exec()
      .then((rows) => {
        const set = new Set<string>();
        const me = session.userId;
        for (const r of rows as unknown as { userId: mongoose.Types.ObjectId; blockedUserId: mongoose.Types.ObjectId }[]) {
          const a = String(r.userId);
          const b = String(r.blockedUserId);
          if (a === me) set.add(b);
          else set.add(a);
        }
        return set;
      }),
    PostEventConnectionModel.find({ userId: myId })
      .select("metUserId")
      .lean()
      .exec()
      .then((rows) => rows.map((r) => String((r as unknown as { metUserId: mongoose.Types.ObjectId }).metUserId))),
  ]);

  const exclude = new Set([session.userId, ...inCircleIds, ...blockedIds]);
  const candidateIds = metUserIds.filter((id) => !exclude.has(id));
  const uniqueCandidates = [...new Set(candidateIds)].slice(0, SUGGESTIONS_LIMIT);

  if (uniqueCandidates.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const candidateOids = uniqueCandidates.map((id) => new mongoose.Types.ObjectId(id));
  const [users, attendeeRows, myCircleRelatedIds, theirCircleRows] = await Promise.all([
    User.find({ _id: { $in: candidateOids } })
      .select("_id fullName name profileImage image headline")
      .lean()
      .exec(),
    EventAttendeeModel.find({
      userId: { $in: [myId, ...candidateOids] },
      status: { $in: ["going", "accepted"] },
    })
      .select("eventId userId")
      .lean()
      .exec(),
    CircleRelationshipModel.find({ userId: myId }).select("relatedUserId").lean().exec(),
    CircleRelationshipModel.find({ userId: { $in: candidateOids } })
      .select("userId relatedUserId")
      .lean()
      .exec(),
  ]);

  const eventsByUser = new Map<string, Set<string>>();
  for (const row of attendeeRows as unknown as { eventId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId }[]) {
    const uid = String(row.userId);
    if (!eventsByUser.has(uid)) eventsByUser.set(uid, new Set());
    eventsByUser.get(uid)!.add(String(row.eventId));
  }
  const myEventIds = eventsByUser.get(session.userId) ?? new Set<string>();

  const myCircleSet = new Set(
    (myCircleRelatedIds as unknown as { relatedUserId: mongoose.Types.ObjectId }[]).map((r) => String(r.relatedUserId))
  );

  const theirCircleByUser = new Map<string, Set<string>>();
  for (const row of theirCircleRows as unknown as { userId: mongoose.Types.ObjectId; relatedUserId: mongoose.Types.ObjectId }[]) {
    const uid = String(row.userId);
    if (!theirCircleByUser.has(uid)) theirCircleByUser.set(uid, new Set());
    theirCircleByUser.get(uid)!.add(String(row.relatedUserId));
  }

  const sharedCountByTarget = new Map<string, number>();
  const eventsTogetherByTarget = new Map<string, number>();
  for (const candidateId of uniqueCandidates) {
    const theirEventIds = eventsByUser.get(candidateId) ?? new Set<string>();
    let eventsTogether = 0;
    for (const eid of myEventIds) {
      if (theirEventIds.has(eid)) eventsTogether++;
    }
    eventsTogetherByTarget.set(candidateId, eventsTogether);
    const theirCircleMemberIds = theirCircleByUser.get(candidateId) ?? new Set<string>();
    let sharedTrusted = 0;
    for (const id of myCircleSet) {
      if (theirCircleMemberIds.has(id)) sharedTrusted++;
    }
    sharedCountByTarget.set(candidateId, sharedTrusted);
  }

  const suggestions = (users as unknown as { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string; headline?: string }[]).map((u) => {
    const id = String(u._id);
    return {
      id,
      fullName: u.fullName,
      name: u.name,
      profileImage: u.profileImage,
      image: u.image,
      headline: u.headline,
      eventsAttendedTogether: eventsTogetherByTarget.get(id) ?? 0,
      sharedTrustedCount: sharedCountByTarget.get(id) ?? 0,
    };
  });

  return NextResponse.json({ suggestions });
}
