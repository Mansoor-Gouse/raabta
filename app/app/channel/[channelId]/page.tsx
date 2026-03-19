"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Channel, useChatContext, useChannelStateContext } from "stream-chat-react";
import { ChannelWithThreadLayout } from "@/components/chat/ChannelWithThreadLayout";
import { CustomChannelHeader } from "@/components/chat/CustomChannelHeader";
import { EmptyChannelState } from "@/components/chat/EmptyChannelState";
import { CustomMessageInputWithRichMedia } from "@/components/chat/CustomMessageInputWithRichMedia";
import { MessageStatusTicks } from "@/components/chat/MessageStatusTicks";
import { EventChannelInfoProvider, type EventChannelInfo } from "@/components/chat/EventChannelInfoContext";
import { ChannelErrorBoundary } from "@/components/chat/ChannelErrorBoundary";
import { EventChannelMessageSystem } from "@/components/chat/EventChannelMessageSystem";
import { FilteredChannelStateWrapper } from "@/components/chat/FilteredChannelStateWrapper";
import { BlockedChatPlaceholder } from "@/components/chat/BlockedChatPlaceholder";
import { getDraft } from "@/lib/draftStorage";

function isOneToOneChannel(members: Record<string, unknown>, currentUserId: string): boolean {
  const entries = Object.values(members) as { user_id?: string; user?: { id?: string } }[];
  const ids = Array.from(new Set(entries.map((m) => m.user?.id ?? m.user_id).filter(Boolean)));
  const otherIds = ids.filter((id) => id !== currentUserId);
  return ids.length === 2 && otherIds.length === 1;
}

function getOtherUserId(members: Record<string, unknown>, currentUserId: string): string | undefined {
  const entries = Object.values(members) as { user_id?: string; user?: { id?: string } }[];
  const other = entries.find((m) => {
    const id = m.user?.id ?? m.user_id;
    return id && id !== currentUserId;
  });
  return other ? (other.user?.id ?? other.user_id) : undefined;
}

function BlockedGuard({ children }: { children: React.ReactNode }) {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const currentUserId = client?.userID ?? "";
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  const refreshBlocked = useCallback(() => {
    fetch("/api/me/block")
      .then((r) => r.json())
      .then((data: { blockedIds?: string[] }) => setBlockedIds(data.blockedIds ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshBlocked();
  }, [refreshBlocked]);

  useEffect(() => {
    function onBlockedUpdated(e: Event) {
      const detail = (e as CustomEvent<{ blockedUserId?: string; unblockedUserId?: string }>).detail;
      if (detail?.blockedUserId) {
        setBlockedIds((prev) => (prev.includes(detail.blockedUserId!) ? prev : [...prev, detail.blockedUserId!]));
      } else if (detail?.unblockedUserId) {
        setBlockedIds((prev) => prev.filter((id) => id !== detail.unblockedUserId));
      }
    }
    window.addEventListener("blocked-users-updated", onBlockedUpdated);
    return () => window.removeEventListener("blocked-users-updated", onBlockedUpdated);
  }, []);

  const members = channel?.state?.members ?? {};
  const is1to1 = isOneToOneChannel(members, currentUserId);
  const otherUserId = getOtherUserId(members, currentUserId);
  const isBlocked = is1to1 && otherUserId && blockedIds.includes(otherUserId);

  if (isBlocked) return <BlockedChatPlaceholder />;
  return <>{children}</>;
}

export default function ChannelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const channelId = params.channelId as string;
  const typeParam = searchParams?.get("type");
  const isEventChannel = channelId.startsWith("event-");
  const channelType: "messaging" | "team" =
    isEventChannel ? "team" : (typeParam === "team" ? "team" : "messaging");
  const { client, setActiveChannel } = useChatContext();
  const [ready, setReady] = useState(false);
  const [eventInfo, setEventInfo] = useState<EventChannelInfo>(null);

  useEffect(() => {
    if (!client || !channelId) return;
    const channel = client.channel(channelType, channelId);
    setActiveChannel?.(channel);
    setReady(true);
  }, [client, channelId, channelType, setActiveChannel]);

  useEffect(() => {
    if (!isEventChannel) return;
    const eventId = channelId.replace(/^event-/, "");
    fetch(`/api/events/${eventId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.title) setEventInfo({ title: data.title, coverImage: data.coverImage });
      })
      .catch(() => {});
  }, [channelId, isEventChannel]);

  if (!client || !ready) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-[var(--ig-bg-primary)]">
        <p className="text-[var(--ig-text-secondary)]">Loading channel…</p>
      </div>
    );
  }

  const cid = `${channelType}:${channelId}`;
  return (
    <ChannelErrorBoundary>
      <EventChannelInfoProvider value={eventInfo}>
        <Channel
          EmptyStateIndicator={EmptyChannelState}
          enrichURLForPreview
          HeaderComponent={CustomChannelHeader}
          Input={CustomMessageInputWithRichMedia}
          MessageStatus={MessageStatusTicks}
          MessageSystem={EventChannelMessageSystem}
          multipleUploads
          maxNumberOfFiles={10}
          optionalMessageInputProps={{ getDefaultValue: () => getDraft(cid) }}
        >
          <BlockedGuard>
            <FilteredChannelStateWrapper>
              <ChannelWithThreadLayout />
            </FilteredChannelStateWrapper>
          </BlockedGuard>
        </Channel>
      </EventChannelInfoProvider>
    </ChannelErrorBoundary>
  );
}
