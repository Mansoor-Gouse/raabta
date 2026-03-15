"use client";

import React from "react";
import { EventComponent, useChannelStateContext } from "stream-chat-react";

type Props = React.ComponentProps<typeof EventComponent>;

/**
 * Hides system messages in event channels to avoid duplicating the event title
 * (shown in the header). For non-event channels, uses the default EventComponent.
 */
export function EventChannelMessageSystem(props: Props) {
  const { channel } = useChannelStateContext();
  const isEventChannel = channel?.id?.startsWith("event-");
  if (isEventChannel) return null;
  return <EventComponent {...props} />;
}
