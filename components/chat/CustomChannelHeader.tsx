"use client";

import React from "react";
import Link from "next/link";
import {
  Avatar as DefaultAvatar,
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
  const memberIds = Object.keys(members);
  const isOneToOne = memberIds.length === 2;
  const currentUserId = client?.userID;
  const otherMemberId = currentUserId
    ? memberIds.find((id) => id !== currentUserId)
    : undefined;
  const otherIsOnline = isOneToOne && otherMemberId && !!watchers[otherMemberId];
  const otherMember = otherMemberId ? (members[otherMemberId] as { user?: { last_active?: string } }) : undefined;
  const lastActive = otherMember?.user?.last_active;
  const lastSeenText =
    isOneToOne && !otherIsOnline && lastActive
      ? formatLastSeen(lastActive)
      : null;

  const channelData = (channel?.data ?? {}) as {
    member_count?: number;
    subtitle?: string;
  };
  const { member_count: member_count_data, subtitle } = channelData;

  const Avatar = props.Avatar ?? DefaultAvatar;
  const MenuIconComponent = props.MenuIcon;
  const groupMembersOpen = useGroupMembersOpen();

  const title = displayTitle || (isEventChannel ? "Event" : "");
  const avatarName = title || " ";
  const memberCount = memberIds.length;
  const isGroup = memberCount > 2;

  return (
    <div className="str-chat__header-livestream str-chat__channel-header">
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
      <Avatar
        image={displayImage}
        name={avatarName}
        shape="rounded"
        size={channel?.type === "commerce" ? 60 : 40}
      />
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
            otherIsOnline ? (
              String(t("Online"))
            ) : lastSeenText ? (
              <span className="text-[var(--ig-text-secondary)] text-xs">{lastSeenText}</span>
            ) : null
          ) : isGroup ? (
            <button
              type="button"
              onClick={() => groupMembersOpen?.setOpen(true)}
              className="text-left text-xs text-[var(--ig-text-secondary)] hover:text-[var(--ig-text)] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)] rounded"
              aria-label={`View group members (${memberCount} members)`}
            >
              {memberCount} members · {String(t("{{ watcherCount }} online", { watcherCount: watcherCount }))}
            </button>
          ) : (
            <>
              {!props.live &&
                member_count_data != null &&
                member_count_data > 0 && (
                  <>
                    {String(t("{{ memberCount }} members", {
                      memberCount: member_count_data,
                    }))}
                    ,{" "}
                  </>
                )}
              {String(t("{{ watcherCount }} online", { watcherCount: watcherCount }))}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
