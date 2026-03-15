"use client";

import { useEffect, useRef, useState } from "react";
import { Chat } from "stream-chat-react";
import { StreamChat } from "stream-chat";
import type { User as StreamUser } from "stream-chat";
import "stream-chat-react/dist/css/v2/index.css";
import { ConnectionStateProvider } from "@/components/chat/ConnectionStateContext";
import { DesktopNotificationHandler } from "@/components/chat/DesktopNotificationHandler";
import { OfflineQueueProvider } from "@/components/chat/OfflineQueueContext";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || "";

export function Providers({
  children,
  userId,
  name,
  image,
}: {
  children: React.ReactNode;
  userId: string;
  name: string;
  image?: string | null;
}) {
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const chatRef = useRef<StreamChat | null>(null);

  useEffect(() => {
    if (!apiKey || !userId) return;

    async function init() {
      const res = await fetch("/api/stream-token");
      if (!res.ok) return;
      const { token, apiKey: key } = await res.json();
      if (!key || !token) return;
      const user: StreamUser = {
        id: userId,
        name: name || userId,
        image: image || undefined,
      };
      const streamChat = StreamChat.getInstance(key);
      await streamChat.connectUser(user, token);
      chatRef.current = streamChat;
      setChatClient(streamChat);
    }
    init();
    return () => {
      if (chatRef.current) void chatRef.current.disconnectUser();
      chatRef.current = null;
    };
  }, [userId, name, image]);

  if (!apiKey) {
    return <div className="p-4 bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400">Stream API key not configured.</div>;
  }
  if (!chatClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Connecting…</p>
      </div>
    );
  }

  return (
    <Chat client={chatClient}>
      <ConnectionStateProvider>
        <OfflineQueueProvider>
          <DesktopNotificationHandler />
          {children}
        </OfflineQueueProvider>
      </ConnectionStateProvider>
    </Chat>
  );
}
