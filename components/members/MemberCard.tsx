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

  return (
    <article
      className={`elite-events block rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] transition-all duration-[var(--elite-transition)] elite-hover-lift focus-within:ring-2 focus-within:ring-[var(--elite-accent)] ${
        compact
          ? "flex shrink-0 flex-col p-3 w-[200px] hover:border-[var(--elite-accent-muted)] hover:shadow-[var(--elite-shadow)]"
          : "flex flex-col p-3 hover:border-[var(--elite-accent-muted)] hover:shadow-[var(--elite-shadow)]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Link href={`/app/members/${member.id}`} className="shrink-0 group/avatar">
          <EliteAvatar
            name={displayName}
            image={avatar ?? null}
            size={compact ? "md" : "md"}
            gradientFallback
            className="ring-2 ring-[var(--elite-border)] group-hover/avatar:ring-[var(--elite-accent-muted)] transition-all"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/app/members/${member.id}`} className="block">
            <p className="elite-heading truncate text-sm font-semibold text-[var(--elite-text)]">{displayName}</p>
            {(subline || member.location) && (
              <p className="elite-body truncate text-[11px] text-[var(--elite-text-secondary)]">
                {subline}
                {subline && member.location ? " · " : ""}
                {member.location}
              </p>
            )}
          </Link>
          {(member.circleTypeForMe === "INNER" || member.circleTypeForMe === "TRUSTED") && (
            <div className="mt-1 flex flex-wrap gap-1">
              {member.circleTypeForMe === "INNER" && (
                <span className="elite-body inline-flex items-center gap-0.5 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--elite-text)]">
                  <IconCircleInner className="w-2.5 h-2.5 shrink-0" />
                  Inner
                </span>
              )}
              {member.circleTypeForMe === "TRUSTED" && (
                <span className="elite-body inline-flex items-center gap-0.5 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--elite-text-secondary)]">
                  <IconTrusted className="w-2.5 h-2.5 shrink-0" />
                  Trusted
                </span>
              )}
            </div>
          )}
          {!compact && ((member.mutualConnectionsCount ?? 0) > 0 || (member.eventsAttendedTogether ?? 0) > 0) && (
            <p className="elite-body mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--elite-text-muted)]">
              {(member.mutualConnectionsCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <IconUserCard className="w-2.5 h-2.5" />
                  {member.mutualConnectionsCount}
                </span>
              )}
              {(member.eventsAttendedTogether ?? 0) > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <IconEvents className="w-2.5 h-2.5" />
                  {member.eventsAttendedTogether}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5">
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
