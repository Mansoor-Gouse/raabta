"use client";

import Link from "next/link";
import { AddToCircleButton } from "@/components/circles/AddToCircleButton";
import { IconUserCard, IconEvents, IconCircleInner, IconTrusted } from "@/components/layout/InstagramIcons";

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
      className={
        compact
          ? "flex shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-3 w-[200px] hover:border-slate-300 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5 transition-all duration-200"
          : "flex flex-col rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 transition-all duration-200 active:translate-y-0"
      }
    >
      <div className="flex items-start gap-3">
        <Link href={`/app/members/${member.id}`} className="shrink-0 group/avatar">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className={`rounded-full object-cover ring-2 ring-slate-200 group-hover/avatar:ring-black/20 transition-all ${
                compact ? "h-12 w-12" : "h-14 w-14"
              }`}
            />
          ) : (
            <span
              className={`flex items-center justify-center rounded-full bg-gradient-to-br from-black/15 to-black/6 text-slate-800 font-semibold group-hover/avatar:from-black/20 group-hover/avatar:to-black/10 transition-all ${
                compact ? "h-12 w-12 text-sm" : "h-14 w-14 text-base"
              }`}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/app/members/${member.id}`} className="block">
            <p className="truncate font-medium text-slate-900">{displayName}</p>
            {(subline || member.location) && (
              <p className="truncate text-xs text-slate-600">
                {subline}
                {subline && member.location ? " — " : ""}
                {member.location}
              </p>
            )}
          </Link>
          {(member.circleTypeForMe === "INNER" || member.circleTypeForMe === "TRUSTED") && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {member.circleTypeForMe === "INNER" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-black/15 to-black/8 px-2 py-0.5 text-[10px] font-medium text-slate-900">
                  <IconCircleInner className="w-3 h-3 shrink-0" />
                  Inner Circle
                </span>
              )}
              {member.circleTypeForMe === "TRUSTED" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-black/10 to-black/5 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                  <IconTrusted className="w-3 h-3 shrink-0" />
                  Trusted Circle
                </span>
              )}
            </div>
          )}
          {!compact && (member.mutualConnectionsCount ?? 0) > 0 && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-600">
              <IconUserCard className="w-3 h-3 text-slate-500" />
              {member.mutualConnectionsCount} shared connection
              {(member.mutualConnectionsCount ?? 0) === 1 ? "" : "s"}
            </p>
          )}
          {!compact && (member.eventsAttendedTogether ?? 0) > 0 && (
            <p className="flex items-center gap-1 text-[11px] text-slate-600">
              <IconEvents className="w-3 h-3 text-slate-500" />
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
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Focus</span>
              {focusTags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="rounded bg-gradient-to-r from-black/6 to-black/3 px-2 py-0.5 text-[10px] text-slate-700"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {concernTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Concern</span>
              {concernTags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="rounded bg-gradient-to-r from-black/6 to-black/3 px-2 py-0.5 text-[10px] text-slate-700"
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
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 hover:text-black hover:bg-gradient-to-r hover:from-black/10 hover:to-black/5 transition-colors"
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
