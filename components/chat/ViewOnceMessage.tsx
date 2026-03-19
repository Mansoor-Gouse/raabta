"use client";

import { useState, useCallback, useRef } from "react";
import { MessageSimple, useMessageContext, useChannelActionContext, useChatContext, useComponentContext, useChannelStateContext } from "stream-chat-react";
import { SharedPostCard, type PostShareAttachment } from "./SharedPostCard";

type CustomData = {
  view_once?: boolean;
  view_once_consumed_by?: string[];
  forwardedFromMessageId?: string;
  forwardedFromChannelId?: string;
  forwardedFromSenderId?: string;
};
type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

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
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const { MessageStatus: MessageStatusComponent } = useComponentContext("MessageSimple");
  const currentUserId = client?.userID;

  const [hasRevealed, setHasRevealed] = useState(false);
  const [showLongPressSheet, setShowLongPressSheet] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const messageText = typeof message.text === "string" ? message.text : "";
  const messageId = typeof message.id === "string" ? message.id : "";
  const ownReactionTypes = new Set<ReactionType>(
    (message.own_reactions ?? [])
      .map((r: { type?: string } | undefined) => r?.type)
      .filter((type: string | undefined): type is ReactionType =>
        type === "like" || type === "love" || type === "haha" || type === "wow" || type === "sad" || type === "angry"
      )
  );
  const isViewOnce = !!customData.view_once;
  const isOwnMessage = isMyMessage?.() ?? false;
  const canReact = !!channel && !!messageId && !isViewOnce;
  const canForward = !!messageId && !isViewOnce;
  const canStar = !!messageId && !!channel?.id && !isViewOnce;
  const canCopy = !!messageText;
  const canDelete = !!channel && !!messageId && isOwnMessage && !isViewOnce;
  const canReport = !!client && !!messageId && !isOwnMessage;

  const closeLongPressSheet = useCallback(() => {
    setShowLongPressSheet(false);
  }, []);

  const onTouchStartLongPress = useCallback(() => {
    if (!messageId) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setShowLongPressSheet(true);
      longPressTimerRef.current = null;
    }, 420);
  }, [messageId]);

  const clearLongPressTimer = useCallback(() => {
    if (!longPressTimerRef.current) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }, []);

  const handleToggleReaction = useCallback(
    async (type: ReactionType) => {
      if (!channel || !messageId || !canReact) return;
      try {
        if (ownReactionTypes.has(type)) {
          await channel.deleteReaction(messageId, type);
        } else {
          await channel.sendReaction(messageId, { type });
        }
        setShowLongPressSheet(false);
      } catch (err) {
        console.warn("[message] toggle reaction failed", { messageId, type, err });
      }
    },
    [channel, messageId, canReact, ownReactionTypes]
  );

  const handleCopyMessage = useCallback(async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(messageText);
      setShowLongPressSheet(false);
    } catch (err) {
      console.warn("[message] copy failed", { messageId, err });
    }
  }, [canCopy, messageText, messageId]);

  const handleForwardMessage = useCallback(() => {
    if (typeof window === "undefined" || !canForward) return;
    window.dispatchEvent(
      new CustomEvent("chat-forward-request", {
        detail: {
          messageId,
          text: messageText,
          senderId: message.user?.id,
          sourceChannelId: channel?.id ?? "",
        },
      })
    );
    setShowLongPressSheet(false);
  }, [canForward, messageId, messageText, message.user?.id, channel?.id]);

  const handleStarMessage = useCallback(async () => {
    if (!canStar || !messageId || !channel?.id) return;
    try {
      const res = await fetch("/api/me/starred-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          channelId: channel.id,
          channelType: channel.type === "team" ? "team" : "messaging",
          senderId: message.user?.id,
          senderName: message.user?.name,
          textPreview: messageText,
        }),
      });
      if (!res.ok) {
        console.warn("[starred] failed to star from long-press", { messageId, channelId: channel.id, status: res.status });
        return;
      }
      setShowLongPressSheet(false);
    } catch (err) {
      console.warn("[starred] star from long-press failed", { messageId, err });
    }
  }, [canStar, messageId, channel?.id, channel?.type, message.user?.id, message.user?.name, messageText]);

  const handleDeleteMessage = useCallback(async () => {
    if (!canDelete || !channel || !messageId) return;
    try {
      await channel.deleteMessage(messageId);
      setShowLongPressSheet(false);
    } catch (err) {
      console.warn("[message] delete failed", { messageId, err });
    }
  }, [canDelete, channel, messageId]);

  const handleReportMessage = useCallback(async () => {
    if (!canReport || !messageId) return;
    try {
      const flagMessage = (client as unknown as { flagMessage?: (id: string) => Promise<unknown> }).flagMessage;
      if (typeof flagMessage === "function") {
        await flagMessage(messageId);
      }
      setShowLongPressSheet(false);
    } catch (err) {
      console.warn("[message] report failed", { messageId, err });
    }
  }, [canReport, client, messageId]);

  const messageBody = (
    <div
      onTouchStart={onTouchStartLongPress}
      onTouchEnd={clearLongPressTimer}
      onTouchCancel={clearLongPressTimer}
      onTouchMove={clearLongPressTimer}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowLongPressSheet(true);
      }}
    >
      {postShareAttachment ? (
        <PostShareMessage
          postShareAttachment={postShareAttachment}
          isSender={isMyMessage?.() ?? false}
          MessageStatusComponent={MessageStatusComponent}
        />
      ) : (
        <MessageSimple {...props} />
      )}
    </div>
  );

  if (postShareAttachment) {
    return (
      <>
        {messageBody}
        <LongPressActionSheet
          open={showLongPressSheet}
          canCopy={canCopy}
          canReact={canReact}
          canForward={canForward}
          canStar={canStar}
          canDelete={canDelete}
          canReport={canReport}
          ownReactionTypes={ownReactionTypes}
          onClose={closeLongPressSheet}
          onReaction={handleToggleReaction}
          onCopy={handleCopyMessage}
          onForward={handleForwardMessage}
          onStar={handleStarMessage}
          onDelete={handleDeleteMessage}
          onReport={handleReportMessage}
        />
      </>
    );
  }

  const isSender = isMyMessage?.() ?? false;

  if (!isViewOnce) {
    if (isForwarded) {
      return (
        <>
          <div className="str-chat__message str-chat__message-simple">
            <div className="px-3 pb-1">
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] bg-[var(--ig-border-light)] text-[var(--ig-text-secondary)]">
                Forwarded
              </span>
            </div>
            {messageBody}
          </div>
          <LongPressActionSheet
            open={showLongPressSheet}
            canCopy={canCopy}
            canReact={canReact}
            canForward={canForward}
            canStar={canStar}
            canDelete={canDelete}
            canReport={canReport}
            ownReactionTypes={ownReactionTypes}
            onClose={closeLongPressSheet}
            onReaction={handleToggleReaction}
            onCopy={handleCopyMessage}
            onForward={handleForwardMessage}
            onStar={handleStarMessage}
            onDelete={handleDeleteMessage}
            onReport={handleReportMessage}
          />
        </>
      );
    }
    return (
      <>
        {messageBody}
        <LongPressActionSheet
          open={showLongPressSheet}
          canCopy={canCopy}
          canReact={canReact}
          canForward={canForward}
          canStar={canStar}
          canDelete={canDelete}
          canReport={canReport}
          ownReactionTypes={ownReactionTypes}
          onClose={closeLongPressSheet}
          onReaction={handleToggleReaction}
          onCopy={handleCopyMessage}
          onForward={handleForwardMessage}
          onStar={handleStarMessage}
          onDelete={handleDeleteMessage}
          onReport={handleReportMessage}
        />
      </>
    );
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

function PostShareMessage({
  postShareAttachment,
  isSender,
  MessageStatusComponent,
}: {
  postShareAttachment: PostShareAttachment & Record<string, unknown>;
  isSender: boolean;
  MessageStatusComponent?: React.ComponentType;
}) {
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

function LongPressActionSheet({
  open,
  canCopy,
  canReact,
  canForward,
  canStar,
  canDelete,
  canReport,
  ownReactionTypes,
  onClose,
  onReaction,
  onCopy,
  onForward,
  onStar,
  onDelete,
  onReport,
}: {
  open: boolean;
  canCopy: boolean;
  canReact: boolean;
  canForward: boolean;
  canStar: boolean;
  canDelete: boolean;
  canReport: boolean;
  ownReactionTypes: Set<ReactionType>;
  onClose: () => void;
  onReaction: (type: ReactionType) => void;
  onCopy: () => void;
  onForward: () => void;
  onStar: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center md:justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-md rounded-t-2xl md:rounded-xl bg-[var(--ig-bg-primary)] border border-[var(--ig-border)] shadow-xl p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--ig-border)] mx-auto mb-3" aria-hidden />
        {canReact && (
          <div className="flex items-center justify-center gap-2 mb-3">
            {[
              { type: "like", emoji: "👍" },
              { type: "love", emoji: "❤️" },
              { type: "haha", emoji: "😂" },
              { type: "wow", emoji: "😮" },
              { type: "sad", emoji: "😢" },
              { type: "angry", emoji: "😡" },
            ].map((entry) => {
              const selected = ownReactionTypes.has(entry.type as ReactionType);
              return (
                <button
                  key={entry.type}
                  type="button"
                  onClick={() => onReaction(entry.type as ReactionType)}
                  className={`px-2 py-1.5 rounded-full text-sm border ${
                    selected
                      ? "bg-[var(--ig-link)]/15 border-[var(--ig-link)] text-[var(--ig-link)]"
                      : "bg-[var(--ig-border-light)] border-[var(--ig-border)] text-[var(--ig-text)]"
                  }`}
                >
                  {entry.emoji}
                </button>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onForward} disabled={!canForward} className="px-3 py-2 rounded-lg border border-[var(--ig-border)] text-sm text-[var(--ig-text)] disabled:opacity-50">
            Forward
          </button>
          <button type="button" onClick={onStar} disabled={!canStar} className="px-3 py-2 rounded-lg border border-[var(--ig-border)] text-sm text-[var(--ig-text)] disabled:opacity-50">
            Star
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!canCopy}
            className="px-3 py-2 rounded-lg border border-[var(--ig-border)] text-sm text-[var(--ig-text)] disabled:opacity-50"
          >
            Copy
          </button>
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg bg-[var(--ig-border-light)] text-sm text-[var(--ig-text)]">
            Cancel
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 rounded-lg border border-red-300 text-sm text-red-600 col-span-2"
            >
              Delete message
            </button>
          )}
          {canReport && (
            <button
              type="button"
              onClick={onReport}
              className="px-3 py-2 rounded-lg border border-[var(--ig-border)] text-sm text-[var(--ig-text)] col-span-2"
            >
              Report message
            </button>
          )}
        </div>
      </div>
    </div>
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
