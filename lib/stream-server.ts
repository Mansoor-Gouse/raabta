/**
 * Stream Chat server-side API (channel creation, user upsert, token).
 * If you see "User with role 'user' is not allowed to perform action ReadChannel in scope 'messaging'",
 * go to Stream Dashboard → Chat → Roles & Permissions → select "user" → enable "Read Channel" for "messaging".
 */
import { StreamChat } from "stream-chat";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || "";
const secret = process.env.STREAM_SECRET || "";

if (!apiKey || !secret) {
  console.warn("Stream credentials not set. Set NEXT_PUBLIC_STREAM_API_KEY and STREAM_SECRET.");
}

let serverClient: StreamChat | null = null;

export function getStreamServerClient(): StreamChat | null {
  if (!apiKey || !secret) return null;
  if (!serverClient) {
    serverClient = StreamChat.getInstance(apiKey, secret);
  }
  return serverClient;
}

export function createStreamToken(userId: string, expiresAt?: number): string | null {
  const client = getStreamServerClient();
  if (!client) return null;
  return client.createToken(userId, expiresAt);
}

export async function upsertStreamUser(
  userId: string,
  data?: { name?: string; image?: string }
): Promise<boolean> {
  const client = getStreamServerClient();
  if (!client) return false;
  try {
    await client.upsertUsers([
      { id: userId, name: data?.name, image: data?.image },
    ]);
    return true;
  } catch (e) {
    console.error("Stream upsertUser", e);
    return false;
  }
}

/**
 * Create or get a channel by id. Adds members if provided.
 * If the channel already exists (e.g. created earlier), adds members and returns id.
 * Returns the channel id or null.
 * Use channelType "team" for event chats to avoid ReadChannel permission issues with "messaging".
 */
export async function createOrGetChannel(
  channelId: string,
  options: { name?: string; image?: string; members: string[]; created_by_id?: string },
  channelType: "messaging" | "team" = "messaging"
): Promise<string | null> {
  const client = getStreamServerClient();
  if (!client) return null;
  const createdBy = options.created_by_id ?? options.members[0];
  const channel = client.channel(channelType, channelId, {
    name: options.name ?? "Event chat",
    image: options.image,
    members: options.members,
    created_by_id: createdBy,
  } as Record<string, unknown>);
  try {
    await channel.create();
    return channel.id ?? channelId;
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string };
    const msg = String(err?.message ?? "").toLowerCase();
    const alreadyExists =
      err?.code === 16 ||
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("unique");
    if (alreadyExists) {
      try {
        await channel.addMembers(options.members);
        return channelId;
      } catch (addErr) {
        console.error("Stream addMembers (existing channel)", addErr);
        return null;
      }
    }
    console.error("Stream createChannel", e);
    return null;
  }
}

/**
 * Update channel custom data (e.g. name, image). Used to keep event channels in sync with event title/cover.
 */
export async function updateChannelData(
  channelId: string,
  channelType: "messaging" | "team",
  data: { name?: string; image?: string }
): Promise<boolean> {
  const client = getStreamServerClient();
  if (!client) return false;
  try {
    const channel = client.channel(channelType, channelId);
    await channel.update(data as Record<string, unknown>);
    return true;
  } catch (e) {
    console.error("Stream channel update", e);
    return false;
  }
}

/**
 * Add members to an existing channel.
 * channelType must match how the channel was created (e.g. "team" for event channels).
 */
export async function addMembersToChannel(
  channelId: string,
  memberIds: string[],
  channelType: "messaging" | "team" = "messaging"
): Promise<boolean> {
  const client = getStreamServerClient();
  if (!client) return false;
  try {
    const channel = client.channel(channelType, channelId);
    await channel.addMembers(memberIds);
    return true;
  } catch (e) {
    console.error("Stream addMembers", e);
    return false;
  }
}
