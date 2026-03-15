"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChatContext } from "stream-chat-react";

const BODY_MAX_LEN = 80;

/** Parse pathname /app/channel/[channelId] to get the channel id segment. */
function getCurrentChannelIdFromPath(pathname: string | null): string | null {
  if (!pathname || !pathname.startsWith("/app/channel/")) return null;
  const segment = pathname.replace(/^\/app\/channel\//, "").split("?")[0].split("/")[0];
  return segment || null;
}

/** Build notification body from message (text or attachment placeholder). */
function getMessageBody(message: { text?: string; attachments?: unknown[] } | undefined): string {
  if (!message) return "";
  const text = (message.text || "").trim().replace(/\s+/g, " ").slice(0, BODY_MAX_LEN);
  if (text) return text;
  if (Array.isArray(message.attachments) && message.attachments.length > 0) return "Photo";
  return "New message";
}

/** Get sender display name from event. */
function getSenderName(event: {
  user?: { name?: string };
  message?: { user?: { name?: string }; user_id?: string };
}): string {
  const name = event.user?.name ?? event.message?.user?.name;
  if (name && typeof name === "string") return name;
  return "Someone";
}

/** Get channel id from event (cid is "type:id", e.g. "messaging:abc"). */
function getChannelIdFromEvent(event: { cid?: string; channel_id?: string }): string | null {
  if (event.channel_id && typeof event.channel_id === "string") return event.channel_id;
  if (event.cid && typeof event.cid === "string") {
    const idx = event.cid.indexOf(":");
    return idx >= 0 ? event.cid.slice(idx + 1) : event.cid;
  }
  return null;
}

function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.Notification !== "undefined";
}

export function DesktopNotificationHandler() {
  const { client } = useChatContext();
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!client?.userID || !isNotificationSupported()) return;

    const handler = (event: {
      message?: { text?: string; user_id?: string; user?: { name?: string }; attachments?: unknown[] };
      user?: { name?: string };
      cid?: string;
      channel_id?: string;
    }) => {
      if (typeof document === "undefined" || !document.hidden) return;
      const msg = event?.message;
      const senderId = msg?.user_id;
      if (senderId === client.userID) return;
      const channelId = getChannelIdFromEvent(event);
      if (!channelId) return;
      const currentChannelId = getCurrentChannelIdFromPath(pathnameRef.current);
      if (currentChannelId === channelId) return;

      const title = getSenderName(event);
      const body = getMessageBody(msg);
      const tag = event.cid ?? `channel:${channelId}`;

      const show = () => {
        const n = new Notification(title, { body, tag, icon: "/icon-192.png" });
        n.onclick = () => {
          n.close();
          window.focus();
          router.push(`/app/channel/${channelId}`);
        };
      };

      const perm = Notification.permission;
      if (perm === "granted") {
        show();
        return;
      }
      if (perm === "denied") return;
      Notification.requestPermission().then((p) => {
        if (p === "granted") show();
      });
    };

    client.on("message.new", handler);
    return () => {
      client.off("message.new", handler);
    };
  }, [client, router]);

  return null;
}
