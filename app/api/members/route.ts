import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import {
  connectDB,
  User,
  CircleRelationshipModel,
  EventAttendeeModel,
  BlockModel,
} from "@/lib/db";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 50;

type CircleType = "INNER" | "TRUSTED";

function parseArrayParam(value: string | null): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const city = searchParams.get("city")?.trim();
  const country = searchParams.get("country")?.trim();
  const region = searchParams.get("region")?.trim();
  const profession = parseArrayParam(searchParams.get("profession"));
  const industry = parseArrayParam(searchParams.get("industry"));
  const expertise = parseArrayParam(searchParams.get("expertise"));
  const interests = parseArrayParam(searchParams.get("interests"));
  const communityRole = parseArrayParam(searchParams.get("communityRole"));
  const inNetwork = searchParams.get("inNetwork") ?? "any";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE)
  );

  const myId = new mongoose.Types.ObjectId(session.userId);

  const [blockedRows, myCircleRows] = await Promise.all([
    BlockModel.find({ userId: session.userId })
      .select("blockedUserId")
      .lean()
      .exec(),
    CircleRelationshipModel.find({ userId: myId })
      .select("relatedUserId circleType")
      .lean()
      .exec(),
  ]);

  const blockedIds = new Set(
    (blockedRows as unknown as { blockedUserId: string }[]).map((r) => r.blockedUserId)
  );
  const circleByUserId = new Map<string, CircleType>();
  for (const r of myCircleRows as unknown as { relatedUserId: mongoose.Types.ObjectId; circleType: CircleType }[]) {
    circleByUserId.set(String(r.relatedUserId), r.circleType);
  }

  const idExclude: mongoose.Types.ObjectId[] = [myId];
  for (const id of blockedIds) {
    idExclude.push(new mongoose.Types.ObjectId(id));
  }

  if (inNetwork === "inner") {
    const innerUserIds = (myCircleRows as unknown as { relatedUserId: mongoose.Types.ObjectId; circleType: string }[])
      .filter((r) => r.circleType === "INNER")
      .map((r) => r.relatedUserId)
      .filter((oid) => !blockedIds.has(String(oid)));
    if (innerUserIds.length === 0) {
      return NextResponse.json({
        members: [],
        facets: { locations: [], industries: [], interests: [], expertise: [], communityRoles: [] },
        meta: { page: 1, pageSize, total: 0, hasMore: false },
      });
    }
    idExclude.length = 0;
    idExclude.push(...innerUserIds);
  } else if (inNetwork === "trusted") {
    const trustedUserIds = (myCircleRows as unknown as { relatedUserId: mongoose.Types.ObjectId; circleType: string }[])
      .filter((r) => r.circleType === "TRUSTED")
      .map((r) => r.relatedUserId)
      .filter((oid) => !blockedIds.has(String(oid)));
    if (trustedUserIds.length === 0) {
      return NextResponse.json({
        members: [],
        facets: { locations: [], industries: [], interests: [], expertise: [], communityRoles: [] },
        meta: { page: 1, pageSize, total: 0, hasMore: false },
      });
    }
    idExclude.length = 0;
    idExclude.push(...trustedUserIds);
  } else if (inNetwork === "not_in_circle") {
    const inCircleIds = (myCircleRows as unknown as { relatedUserId: mongoose.Types.ObjectId }[]).map((r) =>
      String(r.relatedUserId)
    );
    for (const id of inCircleIds) {
      idExclude.push(new mongoose.Types.ObjectId(id));
    }
  }

  const filter: Record<string, unknown> = {};
  if (inNetwork === "inner" || inNetwork === "trusted") {
    filter._id = { $in: idExclude };
  } else {
    filter._id = idExclude.length > 0 ? { $nin: idExclude } : { $ne: myId };
  }

  if (city) filter.location = new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (country) {
    filter.$or = filter.$or ?? [];
    (filter.$or as Record<string, unknown>[]).push({
      location: new RegExp(country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    });
  }
  if (region) {
    filter.$or = filter.$or ?? [];
    (filter.$or as Record<string, unknown>[]).push({
      location: new RegExp(region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    });
  }

  if (profession.length > 0) {
    filter.$and = filter.$and ?? [];
    (filter.$and as Record<string, unknown>[]).push({
      $or: [
        { profession: { $in: profession.map((p) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) } },
        { industries: { $in: profession } },
      ],
    });
  }
  if (industry.length > 0) {
    filter.industries = { $in: industry };
  }
  if (expertise.length > 0) {
    filter.expertise = { $in: expertise };
  }
  if (interests.length > 0) {
    filter.interests = { $in: interests };
  }
  if (communityRole.length > 0) {
    filter.communityRoles = { $in: communityRole };
  }

  if (q.length >= 2) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { fullName: regex },
      { name: regex },
      { headline: regex },
      { location: regex },
      { bio: regex },
      { company: regex },
      { profession: regex },
      { industries: regex },
      { interests: regex },
      { expertise: regex },
    ].filter(Boolean) as Record<string, unknown>[];
  }

  const skip = (page - 1) * pageSize;
  const [total, users] = await Promise.all([
    User.countDocuments(filter).exec(),
    User.find(filter)
      .select(
        "fullName name headline bio location profileImage image industries interests expertise concerns company profession communityRoles isVerified verificationLevel createdAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec(),
  ]);

  const userIds = (users as unknown as { _id: mongoose.Types.ObjectId }[]).map((u) => u._id);

  let eventsTogetherByUser = new Map<string, number>();
  let sharedTrustedByUser = new Map<string, number>();
  let mutualConnectionsByUser = new Map<string, number>();

  if (userIds.length > 0) {
    const [attendeeRows, myCircleRelatedIds, theirCircleRows] = await Promise.all([
      EventAttendeeModel.find({
        userId: { $in: [myId, ...userIds] },
        status: { $in: ["going", "accepted"] },
      })
        .select("eventId userId")
        .lean()
        .exec(),
      CircleRelationshipModel.find({ userId: myId }).select("relatedUserId").lean().exec(),
      CircleRelationshipModel.find({ userId: { $in: userIds } })
        .select("userId relatedUserId")
        .lean()
        .exec(),
    ]);

    const myEventIds = new Set(
      (attendeeRows as unknown as { eventId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId }[])
        .filter((r) => r.userId.equals(myId))
        .map((r) => String(r.eventId))
    );
    const eventsByUser = new Map<string, Set<string>>();
    for (const row of attendeeRows as unknown as { eventId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId }[]) {
      const uid = String(row.userId);
      if (!eventsByUser.has(uid)) eventsByUser.set(uid, new Set());
      eventsByUser.get(uid)!.add(String(row.eventId));
    }

    for (const uid of userIds.map(String)) {
      const theirEventIds = eventsByUser.get(uid) ?? new Set();
      let together = 0;
      for (const eid of myEventIds) {
        if (theirEventIds.has(eid)) together++;
      }
      eventsTogetherByUser.set(uid, together);
    }

    const myCircleSet = new Set(
      (myCircleRelatedIds as unknown as { relatedUserId: mongoose.Types.ObjectId }[]).map((r) => String(r.relatedUserId))
    );
    const theirCircleByUser = new Map<string, Set<string>>();
    for (const row of theirCircleRows as unknown as { userId: mongoose.Types.ObjectId; relatedUserId: mongoose.Types.ObjectId }[]) {
      const uid = String(row.userId);
      if (!theirCircleByUser.has(uid)) theirCircleByUser.set(uid, new Set());
      theirCircleByUser.get(uid)!.add(String(row.relatedUserId));
    }
    for (const uid of userIds.map(String)) {
      const theirCircle = theirCircleByUser.get(uid) ?? new Set();
      let shared = 0;
      for (const id of myCircleSet) {
        if (theirCircle.has(id)) shared++;
      }
      sharedTrustedByUser.set(uid, shared);
      mutualConnectionsByUser.set(uid, shared);
    }
  }

  const members = (users as Record<string, unknown>[]).map((u) => {
    const id = String(u._id);
    return {
      id,
      name: u.name,
      fullName: u.fullName,
      headline: u.headline,
      location: u.location,
      industries: u.industries ?? [],
      interests: u.interests ?? [],
      expertise: u.expertise ?? [],
      concerns: u.concerns ?? [],
      company: u.company,
      profession: u.profession,
      profileImage: u.profileImage || u.image,
      isVerified: u.isVerified,
      verificationLevel: u.verificationLevel,
      circleTypeForMe: circleByUserId.get(id) ?? null,
      eventsAttendedTogether: eventsTogetherByUser.get(id) ?? 0,
      sharedTrustedCount: sharedTrustedByUser.get(id) ?? 0,
      mutualConnectionsCount: mutualConnectionsByUser.get(id) ?? 0,
    };
  });

  const facets = {
    locations: [] as string[],
    industries: [] as string[],
    interests: [] as string[],
    expertise: [] as string[],
    communityRoles: [] as string[],
  };

  return NextResponse.json({
    members,
    facets,
    meta: {
      page,
      pageSize,
      total,
      hasMore: skip + users.length < total,
    },
  });
}
