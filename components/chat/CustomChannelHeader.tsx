"use client";

import React from "react";
import Link from "next/link";
import {
  ChannelHeader as DefaultChannelHeader,
  useChannelStateContext,
  useChannelPreviewInfo,
  useChatContext,
  useTranslationContext,
} from "stream-chat-react";
import { useEventChannelInfo } from "./EventChannelInfoContext";
import { useGroupMembersOpen } from "./GroupMembersOpenContext";

function formatLastSeen(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;
  if (diffDays < 7) return `Last seen ${diffDays}d ago`;
  return "Last seen recently";
}

type ChannelHeaderProps = React.ComponentProps<typeof DefaultChannelHeader>;

/**
 * For 1:1 channels: show only "Online" when the other person is online (no "2 Members, 2 Online").
 * For event channels: show event name and cover from EventChannelInfoContext (fetched on channel page).
 */
export function CustomChannelHeader(props: ChannelHeaderProps) {
  const { channel, watchers = {}, watcherCount = 0 } = useChannelStateContext();
  const { client, openMobileNav } = useChatContext();
  const t = useTranslationContext().t;
  const eventInfo = useEventChannelInfo();
  const isEventChannel = channel?.id?.startsWith("event-");
  const overrideTitle = isEventChannel && eventInfo?.title ? eventInfo.title : props.title;
  const overrideImage = isEventChannel && eventInfo?.coverImage != null ? eventInfo.coverImage : props.image;
  const { displayImage, displayTitle } = useChannelPreviewInfo({
    channel: channel ?? undefined,
    overrideImage,
    overrideTitle,
  });

  const members = channel?.state?.members ?? {};
  const memberEntries = Object.values(members) as Array<{
    user_id?: string;
    user?: { id?: string; last_active?: string };
  }>;

  const currentUserId = client?.userID ?? null;
  const distinctUserIds = Array.from(
    new Set(
      memberEntries
        .map((m) => m.user_id ?? m.user?.id)
        .filter((id): id is string => !!id)
    )
  );
  const otherUserIds = currentUserId ? distinctUserIds.filter((id) => id !== currentUserId) : [];

  const isOneToOne = otherUserIds.length === 1;
  const otherMemberId = isOneToOne ? otherUserIds[0] : undefined;

  const otherMemberEntry = otherMemberId
    ? memberEntries.find((m) => (m.user_id ?? m.user?.id) === otherMemberId)
    : undefined;

  const typingMap = (channel?.state as { typing?: Record<string, unknown> } | undefined)?.typing ?? {};
  const isOtherTyping = isOneToOne && otherMemberId ? !!typingMap[otherMemberId] : false;
  const otherIsOnline = isOneToOne && otherMemberId ? !!watchers[otherMemberId] : false;
  const lastActive = otherMemberEntry?.user?.last_active;
  const lastSeenText = isOneToOne && !otherIsOnline && lastActive ? formatLastSeen(lastActive) : null;

  const channelData = (channel?.data ?? {}) as {
    member_count?: number;
    subtitle?: string;
  };
  const { member_count: member_count_data, subtitle } = channelData;

  const MenuIconComponent = props.MenuIcon;
  const groupMembersOpen = useGroupMembersOpen();

  const title = displayTitle || (isEventChannel ? "Event" : "");
  const avatarName = title || " ";
  const memberCount = distinctUserIds.length;
  const isGroup = memberCount > 2;
  const avatarSize = channel?.type === "commerce" ? 60 : 40;
  const avatarInitial = (avatarName || "?").slice(0, 1).toUpperCase();

  return (
    <div className="str-chat__header-livestream str-chat__channel-header px-2 py-2">
      <button
        type="button"
        aria-label={t("aria/Menu")}
        className="str-chat__header-hamburger"
        onClick={() => openMobileNav?.()}
      >
        {MenuIconComponent ? (
          <MenuIconComponent />
        ) : (
          <svg
            data-testid="menu-icon"
            viewBox="0 0 448 512"
            xmlns="http://www.w3.org/2000/svg"
            className="str-chat__header-hamburger-icon"
          >
            <path
              fill="currentColor"
              d="M0 88C0 74.75 10.75 64 24 64H424C437.3 64 448 74.75 448 88C448 101.3 437.3 112 424 112H24C10.75 112 0 101.3 0 88zM0 248C0 234.7 10.75 224 24 224H424C437.3 224 448 234.7 448 248C448 261.3 437.3 272 424 272H24C10.75 272 0 261.3 0 248zM424 432H24C10.75 432 0 421.3 0 408C0 394.7 10.75 384 24 384H424C437.3 384 448 394.7 448 408C448 421.3 437.3 432 424 432z"
            />
          </svg>
        )}
      </button>
      <div
        className="shrink-0 overflow-hidden bg-[var(--ig-border-light)] rounded-[5px] flex items-center justify-center"
        style={{ width: avatarSize, height: avatarSize }}
        aria-label="Channel avatar"
      >
        {displayImage ? (
          <img src={displayImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-[var(--ig-text-secondary)]">{avatarInitial}</span>
        )}
      </div>
      <div className="str-chat__header-livestream-left str-chat__channel-header-end min-w-0 flex-1">
        {isOneToOne && otherMemberId ? (
          <Link
            href={`/app/members/${otherMemberId}`}
            className="str-chat__header-livestream-left--title str-chat__channel-header-title block truncate font-semibold text-[var(--ig-text)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)] rounded"
          >
            {title}
          </Link>
        ) : (
          <p className="str-chat__header-livestream-left--title str-chat__channel-header-title">
            {title}
            {props.live && (
              <span className="str-chat__header-livestream-left--livelabel">
                {String(t("live"))}
              </span>
            )}
          </p>
        )}
        {subtitle && (
          <p className="str-chat__header-livestream-left--subtitle">{subtitle}</p>
        )}
        <p className="str-chat__header-livestream-left--members str-chat__channel-header-info">
          {isOneToOne ? (
            isOtherTyping ? (
              <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs bg-[var(--ig-border-light)] text-[var(--ig-link)]">
                typing...
              </span>
            ) : otherIsOnline ? (
              <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs bg-[var(--ig-border-light)] text-[var(--ig-text)]">
                {String(t("Online"))}
              </span>
            ) : lastSeenText ? (
              <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs bg-[var(--ig-border-light)] text-[var(--ig-text-secondary)]">
                {lastSeenText}
              </span>
            ) : null
          ) : isGroup ? (
            <button
              type="button"
              onClick={() => groupMembersOpen?.setOpen(true)}
              className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs bg-[var(--ig-border-light)] text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)]"
              aria-label={`View group members (${memberCount} members)`}
            >
              {memberCount} members ·{" "}
              {String(t("{{ watcherCount }} online", { watcherCount: watcherCount }))}
            </button>
          ) : (
            <>
              {!props.live &&
                member_count_data != null &&
                member_count_data > 0 && (
                  <span className="text-xs text-[var(--ig-text-secondary)]">
                    {String(t("{{ memberCount }} members", { memberCount: member_count_data }))}
                  </span>
                )}
              <span className="text-xs text-[var(--ig-text-secondary)]">
                {String(t("{{ watcherCount }} online", { watcherCount: watcherCount }))}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
