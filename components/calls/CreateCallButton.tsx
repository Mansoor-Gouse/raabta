"use client";

import { useCallback } from "react";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useChannelStateContext } from "stream-chat-react";
function randomId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "call-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
}

export function CreateCallButton() {
  const videoClient = useStreamVideoClient();
  const { channel } = useChannelStateContext();

  const createCall = useCallback(() => {
    if (!videoClient || !channel) return;
    const callId = randomId();
    const memberList = Object.values(channel.state.members || {}) as { user_id?: string }[];
    const members = memberList.map((m) => ({ user_id: m.user_id! }));
    videoClient
      .call("default", callId)
      .getOrCreate({
        ring: true,
        data: {
          custom: { channelCid: channel.cid },
          members,
        },
      })
      .catch(console.error);
  }, [videoClient, channel]);

  if (!videoClient) return null;

  return (
    <button
      type="button"
      onClick={createCall}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400"
      title="Start call"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1.02C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
      </svg>
    </button>
  );
}
