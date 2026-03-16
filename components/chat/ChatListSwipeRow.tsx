"use client";

import React, { useCallback, useRef, useState } from "react";

const ACTIONS_WIDTH = 140;
const SNAP_THRESHOLD = 70;

export type ChatListSwipeRowProps = {
  channelId: string;
  /** Row content (avatar, text, menu button). */
  children: React.ReactNode;
  showArchived: boolean;
  muted: boolean;
  hasUnread: boolean;
  /** Which channel row is currently open (swiped). */
  swipedChannelId: string | null;
  /** Currently dragging this channel with this offset (0–140). */
  dragOffset: number;
  /** Called when user commits to horizontal swipe (to close others). */
  onSwipeStart: (channelId: string) => void;
  /** Called with (channelId, offset) during drag; 0 on release. */
  onDrag: (channelId: string | null, offset: number) => void;
  /** Called when row should be open (snap) or closed. */
  onSwipedOpen: (channelId: string | null) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onMute: () => void;
  onUnmute: () => void;
  /** After an action, parent may refresh list. */
  onActionDone: () => void;
};

function ActionButton({
  label,
  iconPath,
  onClick,
  className = "",
}: {
  label: string;
  iconPath: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity ${className}`}
      aria-label={label}
    >
      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d={iconPath} />
      </svg>
      <span className="truncate max-w-full">{label}</span>
    </button>
  );
}

export function ChatListSwipeRow({
  channelId,
  children,
  showArchived,
  muted,
  hasUnread,
  swipedChannelId,
  dragOffset,
  onSwipeStart,
  onDrag,
  onSwipedOpen,
  onArchive,
  onUnarchive,
  onMute,
  onUnmute,
  onActionDone,
}: ChatListSwipeRowProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffsetRef = useRef(0);
  const [committed, setCommitted] = useState(false);

  const isOpen = swipedChannelId === channelId;
  const isDragging = dragOffset > 0;
  const translateX = isDragging ? -dragOffset : isOpen ? -ACTIONS_WIDTH : 0;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      setCommitted(false);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;
      if (!committed) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          setCommitted(true);
          startOffsetRef.current = isOpen ? ACTIONS_WIDTH : 0;
          onSwipeStart(channelId);
        } else {
          return;
        }
      }
      e.preventDefault();
      const base = startOffsetRef.current;
      const offset = dx <= 0
        ? Math.min(ACTIONS_WIDTH, base + (-dx))
        : Math.max(0, base - dx);
      onDrag(channelId, offset);
    },
    [channelId, committed, isOpen, onSwipeStart, onDrag]
  );

  const handleTouchEnd = useCallback(() => {
    const currentOffset = isDragging ? dragOffset : isOpen ? ACTIONS_WIDTH : 0;
    if (currentOffset > SNAP_THRESHOLD) {
      onSwipedOpen(channelId);
      onDrag(channelId, 0);
    } else {
      onSwipedOpen(null);
      onDrag(channelId, 0);
    }
    setCommitted(false);
  }, [channelId, isDragging, isOpen, dragOffset, onSwipedOpen, onDrag]);

  const handleContentClick = useCallback(() => {
    if (isOpen || isDragging) {
      onSwipedOpen(null);
      onDrag(channelId, 0);
    }
  }, [channelId, isOpen, isDragging, onSwipedOpen, onDrag]);

  const runAction = useCallback(
    (fn: () => void | Promise<void>) => {
      void (async () => {
        await fn();
        onSwipedOpen(null);
        onActionDone();
      })();
    },
    [onSwipedOpen, onActionDone]
  );

  return (
    <li className="relative list-none">
      <div className="overflow-hidden w-full" style={{ touchAction: "pan-y" }}>
        <div
          className="flex w-full"
          style={{
            width: "calc(100% + " + ACTIONS_WIDTH + "px)",
            transform: `translateX(${translateX}px)`,
            transition: committed ? "none" : "transform 0.2s ease-out",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* Row content first; swipe left reveals actions on the right */}
          <div
            className="flex flex-1 min-w-0 items-center shrink-0 border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]"
            style={{ minWidth: 0 }}
            onClick={handleContentClick}
            role="presentation"
          >
            {children}
          </div>
          {/* Actions strip (right of content; revealed when content slides left) */}
          <div
            className="flex shrink-0 items-stretch bg-[var(--ig-border)]"
            style={{ width: ACTIONS_WIDTH }}
          >
            {showArchived ? (
              <ActionButton
                label="Unarchive"
                iconPath="M4 6h16v12H4V6zm2 2v8h12V8H6zm4-4h4v2h-4V4z"
                onClick={() => runAction(onUnarchive)}
                className="text-[var(--ig-text)]"
              />
            ) : (
              <ActionButton
                label="Archive"
                iconPath="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM11.65 7.65L10 9.29V13h4v-3.71l-1.65-1.64L12 7l-.35.65z"
                onClick={() => runAction(onArchive)}
                className="text-[var(--ig-text)]"
              />
            )}
            {muted ? (
              <ActionButton
                label="Unmute"
                iconPath="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                onClick={() => runAction(onUnmute)}
                className="text-[var(--ig-text)]"
              />
            ) : (
              <ActionButton
                label="Mute"
                iconPath="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 17.31C15.55 18.37 13.85 19 12 19zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z"
                onClick={() => runAction(onMute)}
                className="text-[var(--ig-text)]"
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
