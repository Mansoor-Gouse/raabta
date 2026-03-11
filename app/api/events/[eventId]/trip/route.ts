import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, EventModel, EventAttendeeModel, TripPlanModel } from "@/lib/db";

function canViewTrip(eventId: string, userId: string): Promise<boolean> {
  return EventModel.findById(eventId)
    .lean()
    .exec()
    .then((event) => {
      if (!event) return false;
      const ev = event as unknown as { hostId: mongoose.Types.ObjectId };
      if (String(ev.hostId) === String(userId)) return true;
      return EventAttendeeModel.findOne({
        eventId: new mongoose.Types.ObjectId(eventId),
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ["going", "accepted", "invited"] },
      })
        .exec()
        .then((att) => !!att);
    });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }
  await connectDB();
  const event = await EventModel.findById(eventId).lean().exec();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const ev = event as unknown as { hostId: mongoose.Types.ObjectId; startAt: Date };
  const isHost = String(ev.hostId) === String(session.userId);
  const allowed = isHost || (await canViewTrip(eventId, String(session.userId)));
  if (!allowed) return NextResponse.json({ error: "Only the host or confirmed attendees can view trip details" }, { status: 403 });
  const eventIdObj = new mongoose.Types.ObjectId(eventId);
  let plan = await TripPlanModel.findOne({ eventId: eventIdObj }).lean().exec();
  if (!plan) {
    await TripPlanModel.create({ eventId: eventIdObj, destinationOptions: [], activities: [] });
    plan = await TripPlanModel.findOne({ eventId: eventIdObj }).lean().exec();
  }
  const p = plan as unknown as {
    destinationOptions: { name: string; votes: number; votedBy: mongoose.Types.ObjectId[] }[];
    selectedHotel?: string;
    activities: { name: string; date?: string }[];
    votingDeadline?: Date;
    decidedDestination?: string;
    activitiesPublishedAt?: Date;
  };
  const myVotes = p.destinationOptions
    .map((opt, i) => (opt.votedBy?.some((id) => String(id) === String(session.userId)) ? i : -1))
    .filter((i) => i >= 0);
  const defaultDeadline = new Date(ev.startAt);
  defaultDeadline.setDate(defaultDeadline.getDate() - 7);
  const deadlineMs = p.votingDeadline ? p.votingDeadline.getTime() : defaultDeadline.getTime();
  const votingClosed = !!p.decidedDestination || Date.now() >= deadlineMs;
  return NextResponse.json({
    destinationOptions: p.destinationOptions,
    selectedHotel: p.selectedHotel,
    activities: p.activities,
    myVotedIndices: myVotes,
    eventStartAt: ev.startAt.toISOString(),
    votingDeadline: p.votingDeadline ? p.votingDeadline.toISOString() : defaultDeadline.toISOString(),
    decidedDestination: p.decidedDestination ?? null,
    votingClosed,
    activitiesPublishedAt: p.activitiesPublishedAt ? p.activitiesPublishedAt.toISOString() : null,
    isHost,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }
  const body = await request.json();
  const { action, destinationName, destinationIndex, hotel, activities, activityName, activityDate, activityIndex, votingDeadline: newVotingDeadline } = body as {
    action?: string;
    destinationName?: string;
    destinationIndex?: number;
    hotel?: string;
    activities?: { name: string; date?: string }[];
    activityName?: string;
    activityDate?: string;
    activityIndex?: number;
    votingDeadline?: string;
  };
  await connectDB();
  const event = await EventModel.findById(eventId).lean().exec();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const ev = event as unknown as { hostId: mongoose.Types.ObjectId };
  const isHost = String(ev.hostId) === String(session.userId);
  const voteOnly = action === "vote";
  if (!voteOnly && !isHost) return NextResponse.json({ error: "Only the event host can manage the trip plan" }, { status: 403 });
  if (voteOnly && !isHost) {
    const allowed = await canViewTrip(eventId, String(session.userId));
    if (!allowed) return NextResponse.json({ error: "Only confirmed attendees can vote" }, { status: 403 });
  }
  const eventIdObj = new mongoose.Types.ObjectId(eventId);
  let plan = await TripPlanModel.findOne({ eventId: eventIdObj }).exec();
  if (!plan) {
    plan = await TripPlanModel.create({ eventId: eventIdObj, destinationOptions: [], activities: [] });
  }
  const p = plan as {
    destinationOptions: { name: string; votes: number; votedBy: mongoose.Types.ObjectId[] }[];
    activities: { name: string; date?: string }[];
    decidedDestination?: string;
    save: () => Promise<unknown>;
  };

  if (action === "finalize" && isHost) {
    const idx = typeof destinationIndex === "number" ? destinationIndex : -1;
    const name = typeof destinationName === "string" ? destinationName.trim() : "";
    const chosen = idx >= 0 && p.destinationOptions[idx]
      ? p.destinationOptions[idx].name
      : name || (idx >= 0 && p.destinationOptions[idx] ? p.destinationOptions[idx].name : null);
    if (chosen) {
      (plan as { decidedDestination?: string }).decidedDestination = chosen;
      await plan.save();
    }
    const updated = await TripPlanModel.findOne({ eventId: eventIdObj }).lean().exec();
    const u = updated as unknown as { destinationOptions: { name: string; votes: number }[]; selectedHotel?: string; activities: { name: string; date?: string }[]; decidedDestination?: string };
    return NextResponse.json({
      destinationOptions: u?.destinationOptions ?? [],
      selectedHotel: u?.selectedHotel,
      activities: u?.activities ?? [],
      decidedDestination: u?.decidedDestination ?? null,
    });
  }

  if (action === "set_voting_deadline" && isHost && typeof newVotingDeadline === "string") {
    if ((plan as { decidedDestination?: string }).decidedDestination) {
      return NextResponse.json({ error: "Destination already decided; cannot change deadline." }, { status: 400 });
    }
    const parsed = new Date(newVotingDeadline);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid deadline date." }, { status: 400 });
    }
    (plan as { votingDeadline?: Date }).votingDeadline = parsed;
    await plan.save();
    const updated = await TripPlanModel.findOne({ eventId: eventIdObj }).lean().exec();
    const u = updated as unknown as { votingDeadline?: Date };
    return NextResponse.json({
      votingDeadline: u?.votingDeadline ? u.votingDeadline.toISOString() : null,
    });
  }

  if (action === "add_destination" && typeof destinationName === "string" && destinationName.trim()) {
    if (p.decidedDestination) {
      return NextResponse.json({ error: "Destination already decided; cannot add more options." }, { status: 400 });
    }
    const exists = p.destinationOptions.some(
      (o) => o.name.toLowerCase() === destinationName.trim().toLowerCase()
    );
    if (!exists) {
      p.destinationOptions.push({
        name: destinationName.trim(),
        votes: 0,
        votedBy: [],
      });
      await plan.save();
    }
  } else if (action === "delete_destination" && isHost && typeof destinationIndex === "number") {
    if (p.decidedDestination) {
      return NextResponse.json({ error: "Destination already decided; cannot remove options." }, { status: 400 });
    }
    if (destinationIndex >= 0 && destinationIndex < p.destinationOptions.length) {
      p.destinationOptions.splice(destinationIndex, 1);
      await plan.save();
    }
  } else if (action === "publish_activities" && isHost) {
    const planDoc = plan as { activitiesPublishedAt?: Date; save: () => Promise<unknown> };
    if (!planDoc.activitiesPublishedAt) {
      planDoc.activitiesPublishedAt = new Date();
      await plan.save();
    }
    const updated = await TripPlanModel.findOne({ eventId: eventIdObj }).lean().exec();
    const u = updated as unknown as { activities: { name: string; date?: string }[]; activitiesPublishedAt?: Date };
    return NextResponse.json({
      activities: u?.activities ?? [],
      activitiesPublishedAt: u?.activitiesPublishedAt ? new Date(u.activitiesPublishedAt).toISOString() : null,
    });
  }

  const planWithPublished = plan as { activitiesPublishedAt?: Date };
  const activitiesLocked = !!planWithPublished.activitiesPublishedAt;

  const evStart = event as unknown as { startAt: Date };
  const defaultDeadline = new Date(evStart.startAt);
  defaultDeadline.setDate(defaultDeadline.getDate() - 7);
  const planDeadline = (plan as unknown as { votingDeadline?: Date }).votingDeadline;
  const voteDeadlineMs = planDeadline ? new Date(planDeadline).getTime() : defaultDeadline.getTime();
  const votingClosedInPost = !!p.decidedDestination || Date.now() >= voteDeadlineMs;

  if (action === "vote" && typeof destinationIndex === "number") {
    if (votingClosedInPost) {
      return NextResponse.json({ error: "Voting is closed." }, { status: 400 });
    }
    const opt = p.destinationOptions[destinationIndex];
    if (opt) {
      const uid = session.userId;
      const idx = (opt.votedBy || []).findIndex((id) => String(id) === String(uid));
      if (idx >= 0) {
        opt.votedBy.splice(idx, 1);
        opt.votes = Math.max(0, (opt.votes || 0) - 1);
      } else {
        opt.votedBy = opt.votedBy || [];
        opt.votedBy.push(
          typeof uid === "string" ? new mongoose.Types.ObjectId(uid) : uid
        );
        opt.votes = (opt.votes || 0) + 1;
      }
      await plan.save();
    }
  } else if (action === "add_activity" && typeof activityName === "string" && activityName.trim()) {
    if (activitiesLocked) {
      return NextResponse.json({ error: "Activities are published and cannot be edited." }, { status: 400 });
    }
    const list = (p.activities || []) as { name: string; date?: string }[];
    list.push({ name: activityName.trim(), date: typeof activityDate === "string" ? activityDate : undefined });
    (plan as { activities: { name: string; date?: string }[] }).activities = list;
    await plan.save();
  } else if (action === "delete_activity" && isHost && typeof activityIndex === "number" && activityIndex >= 0) {
    if (activitiesLocked) {
      return NextResponse.json({ error: "Activities are published and cannot be edited." }, { status: 400 });
    }
    const list = (p.activities || []) as { name: string; date?: string }[];
    if (activityIndex < list.length) {
      list.splice(activityIndex, 1);
      (plan as { activities: { name: string; date?: string }[] }).activities = list;
      await plan.save();
    }
  } else if (action === "update_activity" && isHost && typeof activityIndex === "number" && activityIndex >= 0) {
    if (activitiesLocked) {
      return NextResponse.json({ error: "Activities are published and cannot be edited." }, { status: 400 });
    }
    const list = (p.activities || []) as { name: string; date?: string }[];
    if (activityIndex < list.length && typeof activityName === "string" && activityName.trim()) {
      list[activityIndex] = { name: activityName.trim(), date: typeof activityDate === "string" ? activityDate : undefined };
      (plan as { activities: { name: string; date?: string }[] }).activities = list;
      await plan.save();
    }
  } else if (typeof hotel === "string") {
    (plan as { selectedHotel?: string }).selectedHotel = hotel.trim() || undefined;
    await plan.save();
  } else if (Array.isArray(activities)) {
    if (activitiesLocked) {
      return NextResponse.json({ error: "Activities are published and cannot be edited." }, { status: 400 });
    }
    (plan as { activities: { name: string; date?: string }[] }).activities = activities;
    await plan.save();
  }

  const updated = await TripPlanModel.findOne({ eventId: eventIdObj }).lean().exec();
  const u = updated as unknown as {
    destinationOptions: { name: string; votes: number; votedBy?: mongoose.Types.ObjectId[] }[];
    selectedHotel?: string;
    activities: { name: string; date?: string }[];
    decidedDestination?: string;
    activitiesPublishedAt?: Date;
  };
  const opts = u?.destinationOptions ?? [];
  const myVotedIndices = opts
    .map((opt, i) => (opt.votedBy?.some((id) => String(id) === String(session.userId)) ? i : -1))
    .filter((i) => i >= 0);
  return NextResponse.json({
    destinationOptions: opts.map((o) => ({ name: o.name, votes: o.votes })),
    myVotedIndices,
    selectedHotel: u?.selectedHotel,
    activities: u?.activities ?? [],
    decidedDestination: u?.decidedDestination ?? null,
    activitiesPublishedAt: u?.activitiesPublishedAt ? u.activitiesPublishedAt.toISOString() : null,
  });
}
