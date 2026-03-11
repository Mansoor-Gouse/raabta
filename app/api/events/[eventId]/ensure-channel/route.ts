import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { connectDB, EventModel, EventAttendeeModel, User } from "@/lib/db";
import { createOrGetChannel, addMembersToChannel, updateChannelData, upsertStreamUser } from "@/lib/stream-server";

const CHANNEL_PREFIX = "event-";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { eventId } = await params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }
  await connectDB();
  const event = await EventModel.findById(eventId).lean().exec();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const ev = event as unknown as {
    _id: mongoose.Types.ObjectId;
    title: string;
    hostId: mongoose.Types.ObjectId;
    coverImage?: string;
    channelId?: string;
    channelType?: "messaging" | "team";
  };
  const channelId = ev.channelId ?? `${CHANNEL_PREFIX}${ev._id}`;
  const isAlreadyTeam = ev.channelType === "team";
  const going = await EventAttendeeModel.find(
    { eventId, status: { $in: ["going", "accepted"] } },
    { userId: 1 }
  )
    .lean()
    .exec();
  const memberIds = [
    String(ev.hostId),
    ...going.map((a) =>
      String(
        (a as unknown as { userId: mongoose.Types.ObjectId }).userId
      )
    ),
  ].filter((id, i, arr) => arr.indexOf(id) === i);
  if (!memberIds.includes(session.userId)) {
    memberIds.push(session.userId);
  }
  for (const uid of memberIds) {
    const user = await User.findById(uid).select("name fullName image profileImage").lean().exec();
    const u = user as { name?: string; fullName?: string; image?: string; profileImage?: string } | null;
    await upsertStreamUser(uid, {
      name: u?.fullName || u?.name,
      image: u?.profileImage || u?.image,
    });
  }
  let finalChannelId: string;
  // Always use "team" for event channels to avoid ReadChannel permission issues with "messaging".
  // If this event had a channel created as "messaging" (legacy), migrate: create same id as "team", add members, update event.
  if (ev.channelId && isAlreadyTeam) {
    finalChannelId = ev.channelId;
    const added = await addMembersToChannel(ev.channelId, [session.userId], "team");
    if (!added) {
      return NextResponse.json(
        { error: "Could not add you to event chat. Try again." },
        { status: 503 }
      );
    }
    await updateChannelData(ev.channelId, "team", {
      name: `Event: ${ev.title}`,
      image: ev.coverImage ?? undefined,
    });
    return NextResponse.json({ channelId: finalChannelId, channelType: "team" });
  }
  if (ev.channelId && !isAlreadyTeam) {
    // Migrate: create team channel with same id, add all members, switch event to team
    const created = await createOrGetChannel(
      ev.channelId,
      {
        name: `Event: ${ev.title}`,
        image: ev.coverImage,
        members: memberIds,
        created_by_id: String(ev.hostId),
      },
      "team"
    );
    if (!created) {
      return NextResponse.json(
        { error: "Could not create event chat" },
        { status: 503 }
      );
    }
    finalChannelId = created;
    await EventModel.findByIdAndUpdate(eventId, {
      $set: { channelType: "team" as const },
    }).exec();
    return NextResponse.json({ channelId: finalChannelId, channelType: "team" });
  }
  // New event: no channel yet
  const created = await createOrGetChannel(
    channelId,
    {
      name: `Event: ${ev.title}`,
      image: ev.coverImage,
      members: memberIds,
      created_by_id: String(ev.hostId),
    },
    "team"
  );
  if (!created) {
    return NextResponse.json(
      { error: "Could not create event chat" },
      { status: 503 }
    );
  }
  finalChannelId = created;
  await EventModel.findByIdAndUpdate(eventId, {
    $set: { channelId: finalChannelId, channelType: "team" as const },
  }).exec();
  return NextResponse.json({ channelId: finalChannelId, channelType: "team" });
}
