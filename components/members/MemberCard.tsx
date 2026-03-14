"use client";

import Link from "next/link";
import { AddToCircleButton } from "@/components/circles/AddToCircleButton";
import { IconUserCard, IconEvents, IconCircleInner, IconTrusted } from "@/components/layout/InstagramIcons";
import { EliteAvatar } from "@/components/elite";

export type MemberCardData = {
  id: string;
  name?: string | null;
  fullName?: string | null;
  headline?: string | null;
  location?: string | null;
  industries?: string[];
  interests?: string[];
  expertise?: string[];
  concerns?: string[];
  company?: string | null;
  profession?: string | null;
  profileImage?: string | null;
  circleTypeForMe?: "INNER" | "TRUSTED" | null;
  eventsAttendedTogether?: number;
  sharedTrustedCount?: number;
  mutualConnectionsCount?: number;
};

type Props = {
  member: MemberCardData;
  innerCount: number;
  trustedCount: number;
  compact?: boolean;
  onUpdated?: () => void;
};

export function MemberCard({
  member,
  innerCount,
  trustedCount,
  compact = false,
  onUpdated,
}: Props) {
  const displayName = member.fullName || member.name || "Member";
  const avatar = member.profileImage;
  const subline = [member.profession, member.company].filter(Boolean).join(" — ") || member.headline || null;
  const focusTags = member.expertise?.length ? member.expertise : member.industries?.slice(0, 3) ?? [];
  const concernTags = member.concerns ?? [];

  return (
    <article
      className={`elite-events block rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] transition-all duration-[var(--elite-transition)] elite-hover-lift focus-within:ring-2 focus-within:ring-[var(--elite-accent)] ${
        compact
          ? "flex shrink-0 flex-col p-3 w-[200px] hover:border-[var(--elite-accent-muted)] hover:shadow-[var(--elite-shadow)]"
          : "flex flex-col p-4 hover:border-[var(--elite-accent-muted)] hover:shadow-[var(--elite-shadow)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <Link href={`/app/members/${member.id}`} className="shrink-0 group/avatar">
          <EliteAvatar
            name={displayName}
            image={avatar ?? null}
            size={compact ? "md" : "lg"}
            gradientFallback
            className="ring-2 ring-[var(--elite-border)] group-hover/avatar:ring-[var(--elite-accent-muted)] transition-all"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/app/members/${member.id}`} className="block">
            <p className="elite-heading truncate font-semibold text-[var(--elite-text)]">{displayName}</p>
            {(subline || member.location) && (
              <p className="elite-body truncate text-xs text-[var(--elite-text-secondary)]">
                {subline}
                {subline && member.location ? " — " : ""}
                {member.location}
              </p>
            )}
          </Link>
          {(member.circleTypeForMe === "INNER" || member.circleTypeForMe === "TRUSTED") && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {member.circleTypeForMe === "INNER" && (
                <span className="elite-body inline-flex items-center gap-1 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--elite-text)]">
                  <IconCircleInner className="w-3 h-3 shrink-0" />
                  Inner Circle
                </span>
              )}
              {member.circleTypeForMe === "TRUSTED" && (
                <span className="elite-body inline-flex items-center gap-1 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--elite-text-secondary)]">
                  <IconTrusted className="w-3 h-3 shrink-0" />
                  Trusted Circle
                </span>
              )}
            </div>
          )}
          {!compact && (member.mutualConnectionsCount ?? 0) > 0 && (
            <p className="elite-body mt-1 flex items-center gap-1 text-[11px] text-[var(--elite-text-secondary)]">
              <IconUserCard className="w-3 h-3 text-[var(--elite-text-muted)]" />
              {member.mutualConnectionsCount} shared connection
              {(member.mutualConnectionsCount ?? 0) === 1 ? "" : "s"}
            </p>
          )}
          {!compact && (member.eventsAttendedTogether ?? 0) > 0 && (
            <p className="elite-body flex items-center gap-1 text-[11px] text-[var(--elite-text-secondary)]">
              <IconEvents className="w-3 h-3 text-[var(--elite-text-muted)]" />
              {member.eventsAttendedTogether} shared event
              {(member.eventsAttendedTogether ?? 0) === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {!compact && (focusTags.length > 0 || concernTags.length > 0) && (
        <div className="mt-3 space-y-1">
          {focusTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="elite-body text-[10px] font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">Focus</span>
              {focusTags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="elite-body rounded border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-0.5 text-[10px] text-[var(--elite-text-secondary)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {concernTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="elite-body text-[10px] font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">Concern</span>
              {concernTags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="elite-body rounded border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-0.5 text-[10px] text-[var(--elite-text-secondary)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/app/members/${member.id}`}
          className="elite-events inline-flex items-center gap-1.5 rounded-[var(--elite-radius)] px-2.5 py-1 text-xs font-medium text-[var(--elite-text)] border border-[var(--elite-border)] hover:border-[var(--elite-accent-muted)] transition-colors duration-[var(--elite-transition)]"
        >
          <IconUserCard className="w-3.5 h-3.5" />
          View Profile
        </Link>
        <AddToCircleButton
          relatedUserId={member.id}
          currentCircle={member.circleTypeForMe ?? null}
          innerCount={innerCount}
          trustedCount={trustedCount}
          onUpdated={onUpdated}
          compact={compact}
        />
      </div>
    </article>
  );
}
