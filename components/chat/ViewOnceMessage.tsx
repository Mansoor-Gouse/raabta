"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MessageSimple, useMessageContext, useChannelActionContext, useChatContext, useComponentContext, useChannelStateContext } from "stream-chat-react";
import { SharedPostCard, type PostShareAttachment } from "./SharedPostCard";
import { SharedStoryCard, type StoryShareAttachment } from "./SharedStoryCard";

type CustomData = {
  view_once?: boolean;
  view_once_consumed_by?: string[];
  forwardedFromMessageId?: string;
  forwardedFromChannelId?: string;
  forwardedFromSenderId?: string;
};
type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";
const REACTION_EMOJI: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
};

function getReactionCount(
  message: { reaction_counts?: Record<string, number>; latest_reactions?: Array<{ type?: string }> },
  type: ReactionType
): number {
  const direct = message.reaction_counts?.[type];
  if (typeof direct === "number" && Number.isFinite(direct)) return Math.max(0, Math.floor(direct));
  const latest = message.latest_reactions ?? [];
  return latest.reduce((acc, r) => (r?.type === type ? acc + 1 : acc), 0);
}

function getPostShareAttachment(message: { attachments?: Array<{ type?: string } & Record<string, unknown>> }): (PostShareAttachment & Record<string, unknown>) | null {
  const attachments = message.attachments ?? [];
  const found = attachments.find((a) => a.type === "post_share");
  return found ? (found as PostShareAttachment & Record<string, unknown>) : null;
}

function getStoryShareAttachment(
  message: { attachments?: Array<{ type?: string } & Record<string, unknown>> }
): (StoryShareAttachment & Record<string, unknown>) | null {
  const attachments = message.attachments ?? [];
  const found = attachments.find((a) => a.type === "story_share");
  return found ? (found as StoryShareAttachment & Record<string, unknown>) : null;
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
  const [sheetBusy, setSheetBusy] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [starredLoaded, setStarredLoaded] = useState(false);
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
  const storyShareAttachment = getStoryShareAttachment(message);
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
  const reactionCounts: Record<ReactionType, number> = {
    like: getReactionCount(message, "like"),
    love: getReactionCount(message, "love"),
    haha: getReactionCount(message, "haha"),
    wow: getReactionCount(message, "wow"),
    sad: getReactionCount(message, "sad"),
    angry: getReactionCount(message, "angry"),
  };
  const hasAnyReaction = Object.values(reactionCounts).some((count) => count > 0);

  const closeLongPressSheet = useCallback(() => {
    setShowLongPressSheet(false);
  }, []);

  useEffect(() => {
    setIsStarred(false);
    setStarredLoaded(false);
  }, [messageId, channel?.id]);

  useEffect(() => {
    if (!showLongPressSheet || !messageId || !channel?.id || !canStar) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/me/starred-messages/${encodeURIComponent(messageId)}?channelId=${encodeURIComponent(channel.id)}`
        );
        const data = (await res.json().catch(() => null)) as { starred?: boolean } | null;
        if (!cancelled) {
          setIsStarred(!!data?.starred);
          setStarredLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setIsStarred(false);
          setStarredLoaded(true);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showLongPressSheet, messageId, channel?.id, canStar]);

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
      if (!channel || !messageId || !canReact || sheetBusy) return;
      try {
        setSheetBusy(true);
        if (ownReactionTypes.has(type)) {
          await channel.deleteReaction(messageId, type);
        } else {
          await channel.sendReaction(messageId, { type });
        }
        setShowLongPressSheet(false);
      } catch (err) {
        console.warn("[message] toggle reaction failed", { messageId, type, err });
      } finally {
        setSheetBusy(false);
      }
    },
    [channel, messageId, canReact, ownReactionTypes, sheetBusy]
  );

  const handleCopyMessage = useCallback(async () => {
    if (!canCopy || sheetBusy) return;
    try {
      setSheetBusy(true);
      await navigator.clipboard.writeText(messageText);
      setShowLongPressSheet(false);
    } catch (err) {
      console.warn("[message] copy failed", { messageId, err });
    } finally {
      setSheetBusy(false);
    }
  }, [canCopy, messageText, messageId, sheetBusy]);

  const handleForwardMessage = useCallback(() => {
    if (typeof window === "undefined" || !canForward || sheetBusy) return;
    setSheetBusy(true);
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
    setSheetBusy(false);
  }, [canForward, messageId, messageText, message.user?.id, channel?.id, sheetBusy]);

  const handleToggleStarMessage = useCallback(async () => {
    if (!canStar || !messageId || !channel?.id || sheetBusy) return;
    try {
      setSheetBusy(true);
      const res = isStarred
        ? await fetch(`/api/me/starred-messages/${encodeURIComponent(messageId)}?channelId=${encodeURIComponent(channel.id)}`, {
            method: "DELETE",
          })
        : await fetch("/api/me/starred-messages", {
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
        console.warn("[starred] failed to toggle star from long-press", {
          messageId,
          channelId: channel.id,
          status: res.status,
          isStarred,
        });
        return;
      }
      setIsStarred((prev) => !prev);
      setShowLongPressSheet(false);
    } catch (err) {
      console.warn("[starred] toggle star from long-press failed", { messageId, err });
    } finally {
      setSheetBusy(false);
    }
  }, [canStar, messageId, channel?.id, channel?.type, message.user?.id, message.user?.name, messageText, sheetBusy, isStarred]);

  const handleDeleteMessage = useCallback(async () => {
    if (!canDelete || !channel || !messageId || sheetBusy) return;
    try {
      setSheetBusy(true);
      await channel.deleteMessage(messageId);
      setShowLongPressSheet(false);
    } catch (err) {
      console.warn("[message] delete failed", { messageId, err });
    } finally {
      setSheetBusy(false);
    }
  }, [canDelete, channel, messageId, sheetBusy]);

  const handleReportMessage = useCallback(async () => {
    if (!canReport || !messageId || sheetBusy) return;
    try {
      setSheetBusy(true);
      const flagMessage = (client as unknown as { flagMessage?: (id: string) => Promise<unknown> }).flagMessage;
      if (typeof flagMessage === "function") {
        await flagMessage(messageId);
      }
      setShowLongPressSheet(false);
    } catch (err) {
      console.warn("[message] report failed", { messageId, err });
    } finally {
      setSheetBusy(false);
    }
  }, [canReport, client, messageId, sheetBusy]);

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
      {storyShareAttachment ? (
        <StoryShareMessage
          storyShareAttachment={storyShareAttachment}
          isSender={isMyMessage?.() ?? false}
          MessageStatusComponent={MessageStatusComponent}
        />
      ) : postShareAttachment ? (
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

  if (postShareAttachment || storyShareAttachment) {
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
          busy={sheetBusy}
          isStarred={isStarred}
          starredLoaded={starredLoaded}
          ownReactionTypes={ownReactionTypes}
          onClose={closeLongPressSheet}
          onReaction={handleToggleReaction}
          onCopy={handleCopyMessage}
          onForward={handleForwardMessage}
          onStar={handleToggleStarMessage}
          onDelete={handleDeleteMessage}
          onReport={handleReportMessage}
        />
        <ReactionSummaryBar
          visible={canReact && hasAnyReaction}
          ownReactionTypes={ownReactionTypes}
          reactionCounts={reactionCounts}
          onToggleReaction={handleToggleReaction}
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
            busy={sheetBusy}
            isStarred={isStarred}
            starredLoaded={starredLoaded}
            ownReactionTypes={ownReactionTypes}
            onClose={closeLongPressSheet}
            onReaction={handleToggleReaction}
            onCopy={handleCopyMessage}
            onForward={handleForwardMessage}
            onStar={handleToggleStarMessage}
            onDelete={handleDeleteMessage}
            onReport={handleReportMessage}
          />
          <ReactionSummaryBar
            visible={canReact && hasAnyReaction}
            ownReactionTypes={ownReactionTypes}
            reactionCounts={reactionCounts}
            onToggleReaction={handleToggleReaction}
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
          busy={sheetBusy}
          isStarred={isStarred}
          starredLoaded={starredLoaded}
          ownReactionTypes={ownReactionTypes}
          onClose={closeLongPressSheet}
          onReaction={handleToggleReaction}
          onCopy={handleCopyMessage}
          onForward={handleForwardMessage}
          onStar={handleToggleStarMessage}
          onDelete={handleDeleteMessage}
          onReport={handleReportMessage}
        />
        <ReactionSummaryBar
          visible={canReact && hasAnyReaction}
          ownReactionTypes={ownReactionTypes}
          reactionCounts={reactionCounts}
          onToggleReaction={handleToggleReaction}
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

function StoryShareMessage({
  storyShareAttachment,
  isSender,
  MessageStatusComponent,
}: {
  storyShareAttachment: StoryShareAttachment & Record<string, unknown>;
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
        <SharedStoryCard attachment={storyShareAttachment} />
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
  busy,
  isStarred,
  starredLoaded,
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
  busy: boolean;
  isStarred: boolean;
  starredLoaded: boolean;
  ownReactionTypes: Set<ReactionType>;
  onClose: () => void;
  onReaction: (type: ReactionType) => void;
  onCopy: () => void;
  onForward: () => void;
  onStar: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center md:justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-md rounded-t-2xl md:rounded-xl bg-[var(--ig-bg-primary)] border border-[var(--ig-border)] shadow-xl p-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Message actions"
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
                  disabled={busy}
                  className={`px-2 py-1.5 rounded-full text-sm border transition-transform active:scale-95 ${
                    selected
                      ? "bg-[var(--ig-link)]/15 border-[var(--ig-link)] text-[var(--ig-link)]"
                      : "bg-[var(--ig-border-light)] border-[var(--ig-border)] text-[var(--ig-text)]"
                  } disabled:opacity-50`}
                  aria-label={`React ${entry.type}`}
                >
                  {entry.emoji}
                </button>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onForward}
            disabled={!canForward || busy}
            className="px-3 py-2 rounded-lg border border-[var(--ig-border)] text-sm text-[var(--ig-text)] disabled:opacity-50 transition-transform active:scale-[0.99] inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8l-6 4 6 4V8zM9 8v8" />
            </svg>
            <span>Forward</span>
          </button>
          <button
            type="button"
            onClick={onStar}
            disabled={!canStar || busy || !starredLoaded}
            className="px-3 py-2 rounded-lg border border-[var(--ig-border)] text-sm text-[var(--ig-text)] disabled:opacity-50 transition-transform active:scale-[0.99] inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.157c.969 0 1.371 1.24.588 1.81l-3.363 2.443a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118l-3.363-2.443a1 1 0 00-1.176 0l-3.363 2.443c-.784.57-1.838-.197-1.539-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.98 9.382c-.783-.57-.38-1.81.588-1.81h4.157a1 1 0 00.95-.69l1.286-3.955z" />
            </svg>
            <span>{isStarred ? "Unstar" : "Star"}</span>
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!canCopy || busy}
            className="px-3 py-2 rounded-lg border border-[var(--ig-border)] text-sm text-[var(--ig-text)] disabled:opacity-50 transition-transform active:scale-[0.99] inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7V5a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h2" />
            </svg>
            <span>Copy</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-2 rounded-lg bg-[var(--ig-border-light)] text-sm text-[var(--ig-text)] transition-transform active:scale-[0.99] disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancel</span>
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="px-3 py-2 rounded-lg border border-red-300 text-sm text-red-600 col-span-2 transition-transform active:scale-[0.99] inline-flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h4a2 2 0 012 2v2M4 7h16" />
              </svg>
              <span>Delete message</span>
            </button>
          )}
          {canReport && (
            <button
              type="button"
              onClick={onReport}
              disabled={busy}
              className="px-3 py-2 rounded-lg border border-[var(--ig-border)] text-sm text-[var(--ig-text)] col-span-2 transition-transform active:scale-[0.99] inline-flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-7 8l4-4h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2z" />
              </svg>
              <span>Report message</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReactionSummaryBar({
  visible,
  ownReactionTypes,
  reactionCounts,
  onToggleReaction,
}: {
  visible: boolean;
  ownReactionTypes: Set<ReactionType>;
  reactionCounts: Record<ReactionType, number>;
  onToggleReaction: (type: ReactionType) => void;
}) {
  if (!visible) return null;
  const entries = (Object.keys(REACTION_EMOJI) as ReactionType[]).filter((type) => reactionCounts[type] > 0);
  if (entries.length === 0) return null;

  return (
    <div className="px-3 pt-1 pb-0.5 flex flex-wrap items-center gap-1.5">
      {entries.map((type) => {
        const selected = ownReactionTypes.has(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggleReaction(type)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${
              selected
                ? "bg-[var(--ig-link)]/15 border-[var(--ig-link)] text-[var(--ig-link)]"
                : "bg-[var(--ig-border-light)] border-[var(--ig-border)] text-[var(--ig-text-secondary)]"
            }`}
            aria-label={`${type} reaction ${reactionCounts[type]}`}
          >
            <span>{REACTION_EMOJI[type]}</span>
            <span>{reactionCounts[type]}</span>
          </button>
        );
      })}
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
