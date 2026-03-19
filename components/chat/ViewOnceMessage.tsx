"use client";

import { useState, useCallback } from "react";
import { MessageSimple, useMessageContext, useChannelActionContext, useChatContext, useComponentContext } from "stream-chat-react";
import { SharedPostCard, type PostShareAttachment } from "./SharedPostCard";

type CustomData = {
  view_once?: boolean;
  view_once_consumed_by?: string[];
  forwardedFromMessageId?: string;
  forwardedFromChannelId?: string;
  forwardedFromSenderId?: string;
};

function getPostShareAttachment(message: { attachments?: Array<{ type?: string } & Record<string, unknown>> }): (PostShareAttachment & Record<string, unknown>) | null {
  const attachments = message.attachments ?? [];
  const found = attachments.find((a) => a.type === "post_share");
  return found ? (found as PostShareAttachment & Record<string, unknown>) : null;
}

/**
 * Wraps MessageSimple. Renders SharedPostCard for post_share attachments.
 * For messages with customData.view_once:
 * - Shows "Tap to view" until the user taps.
 * - On tap, marks the message as consumed (view_once_consumed_by) and shows content once.
 * - After consumed, shows "Viewed" placeholder.
 */
export function ViewOnceMessage(props: React.ComponentProps<typeof MessageSimple>) {
  const { message, isMyMessage } = useMessageContext();
  const { updateMessage } = useChannelActionContext();
  const { client } = useChatContext();
  const { MessageStatus: MessageStatusComponent } = useComponentContext("MessageSimple");
  const currentUserId = client?.userID;

  const [hasRevealed, setHasRevealed] = useState(false);

  if (!message) return null;

  const customData = (message.customData || {}) as CustomData;
  const consumedBy = customData.view_once_consumed_by || [];
  const consumed = !!currentUserId && consumedBy.includes(currentUserId);
  const isForwarded = !!customData.forwardedFromMessageId;

  const handleTapToView = useCallback(() => {
    if (!currentUserId || consumed) return;
    setHasRevealed(true);
    const updated = {
      ...message,
      customData: {
        ...(message.customData as Record<string, unknown> || {}),
        view_once_consumed_by: [...consumedBy, currentUserId],
      },
    };
    updateMessage(updated);
  }, [currentUserId, consumed, message, consumedBy, updateMessage]);

  const postShareAttachment = getPostShareAttachment(message);
  if (postShareAttachment) {
    const isSender = isMyMessage?.() ?? false;
    const rootClassName = [
      "str-chat__message",
      "str-chat__message-simple",
      "str-chat__message--has-attachment",
      isSender ? "str-chat__message--me str-chat__message-simple--me" : "str-chat__message--other",
    ].join(" ");
    return (
      <div className={rootClassName}>
        <div className={`str-chat__message-inner str-chat__message-simple-inner flex items-end gap-2 ${isSender ? "flex-row-reverse" : ""}`}>
          <SharedPostCard attachment={postShareAttachment} />
          {MessageStatusComponent && (
            <span className="inline-flex items-center shrink-0 self-end pb-0.5">
              <MessageStatusComponent />
            </span>
          )}
        </div>
      </div>
    );
  }

  const isViewOnce = !!customData.view_once;
  const isSender = isMyMessage?.() ?? false;

  if (!isViewOnce) {
    if (isForwarded) {
      return (
        <div className="str-chat__message str-chat__message-simple">
          <div className="px-3 pb-1">
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] bg-[var(--ig-border-light)] text-[var(--ig-text-secondary)]">
              Forwarded
            </span>
          </div>
          <MessageSimple {...props} />
        </div>
      );
    }
    return <MessageSimple {...props} />;
  }

  if (isSender) {
    return <MessageSimple {...props} />;
  }

  if (consumed) {
    return (
      <div className="str-chat__message str-chat__message-simple str-chat__message--view-once-viewed">
        <div className="px-3 py-2 rounded-lg bg-[var(--ig-border-light)] inline-block text-sm text-[var(--ig-text-secondary)]">
          View once photo
        </div>
      </div>
    );
  }

  if (hasRevealed) {
    return <MessageSimple {...props} />;
  }

  return (
    <button
      type="button"
      onClick={handleTapToView}
      className="str-chat__message str-chat__message-simple str-chat__message--view-once-tap w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ig-text)]"
    >
      <div className="px-4 py-3 rounded-lg bg-[var(--ig-border-light)] inline-flex items-center gap-2 text-sm text-[var(--ig-text)]">
        <ViewOnceEyeIcon />
        <span>Tap to view</span>
      </div>
    </button>
  );
}

function ViewOnceEyeIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}
