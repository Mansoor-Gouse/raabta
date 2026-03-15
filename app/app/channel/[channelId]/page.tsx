"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Channel, useChatContext } from "stream-chat-react";
import { ChannelWithThreadLayout } from "@/components/chat/ChannelWithThreadLayout";
import { CustomChannelHeader } from "@/components/chat/CustomChannelHeader";
import { EmptyChannelState } from "@/components/chat/EmptyChannelState";
import { CustomMessageInputWithRichMedia } from "@/components/chat/CustomMessageInputWithRichMedia";
import { MessageStatusTicks } from "@/components/chat/MessageStatusTicks";
import { EventChannelInfoProvider, type EventChannelInfo } from "@/components/chat/EventChannelInfoContext";
import { ChannelErrorBoundary } from "@/components/chat/ChannelErrorBoundary";
import { EventChannelMessageSystem } from "@/components/chat/EventChannelMessageSystem";
import { ViewOnceProvider } from "@/components/chat/ViewOnceContext";
import { ViewOnceMessage } from "@/components/chat/ViewOnceMessage";
import { FilteredChannelStateWrapper } from "@/components/chat/FilteredChannelStateWrapper";
import { getDraft } from "@/lib/draftStorage";

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
      <ViewOnceProvider>
        <EventChannelInfoProvider value={eventInfo}>
          <Channel
            EmptyStateIndicator={EmptyChannelState}
            enrichURLForPreview
            HeaderComponent={CustomChannelHeader}
            Input={CustomMessageInputWithRichMedia}
            Message={ViewOnceMessage}
            MessageStatus={MessageStatusTicks}
            MessageSystem={EventChannelMessageSystem}
            multipleUploads
            maxNumberOfFiles={10}
            optionalMessageInputProps={{ getDefaultValue: () => getDraft(cid) }}
          >
            <FilteredChannelStateWrapper>
              <ChannelWithThreadLayout />
            </FilteredChannelStateWrapper>
          </Channel>
        </EventChannelInfoProvider>
      </ViewOnceProvider>
    </ChannelErrorBoundary>
  );
}
