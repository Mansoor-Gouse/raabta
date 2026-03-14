"use client";

import Link from "next/link";

export type EventCardEvent = {
  _id: string;
  title: string;
  type: string;
  startAt: string;
  location?: string;
  coverImage?: string;
  hostName: string;
  hostImage?: string | null;
  goingCount: number;
};

type EventCardProps = {
  event: EventCardEvent;
  compact?: boolean;
  variant?: "default" | "elite";
};

export function EventCard({ event, compact = false, variant = "default" }: EventCardProps) {
  const isElite = variant === "elite";
  const border = isElite ? "border-[var(--elite-border)]" : "border-[var(--ig-border)]";
  const bg = isElite ? "bg-[var(--elite-card)]" : "bg-[var(--ig-bg-primary)]";
  const hoverBorder = isElite ? "hover:border-[var(--elite-accent-muted)]" : "hover:border-[var(--ig-text-tertiary)]";
  const focusRing = isElite ? "focus-visible:ring-[var(--elite-accent)]" : "focus-visible:ring-[var(--ig-link)]";
  const typeColor = isElite ? "text-[var(--elite-accent)]" : "text-[var(--ig-link)]";
  const titleColor = isElite ? "text-[var(--elite-text)]" : "text-[var(--ig-text)]";
  const mutedColor = isElite ? "text-[var(--elite-text-secondary)]" : "text-[var(--ig-text-secondary)]";
  const thumbBg = isElite ? "bg-[var(--elite-border-light)]" : "bg-[var(--ig-border-light)]";

  return (
    <Link
      href={`/app/events/${event._id}`}
      className={`block rounded-[var(--elite-radius-lg)] border overflow-hidden ${border} ${bg} ${hoverBorder} focus-visible:outline focus-visible:ring-2 ${focusRing} transition-colors duration-[var(--elite-transition)]`}
    >
      {event.coverImage ? (
        <div className={`aspect-[2/1] ${thumbBg}`}>
          <img
            src={event.coverImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[2/1] bg-[var(--elite-border-light)] flex items-center justify-center">
          <span className="text-4xl text-[var(--elite-text-muted)]">
            {event.type === "umrah" || event.type === "hajj" ? "🕋" : "📅"}
          </span>
        </div>
      )}
      <div className={compact ? "p-3" : "p-4"}>
        <p className={`text-xs font-medium uppercase tracking-wide ${typeColor}`}>
          {event.type}
        </p>
        <h3 className={`font-semibold mt-0.5 ${titleColor}`}>
          {event.title}
        </h3>
        <p className={`text-sm mt-1 ${mutedColor}`}>
          {new Date(event.startAt).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {event.location && ` · ${event.location}`}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-6 h-6 rounded-full ${thumbBg} flex items-center justify-center overflow-hidden shrink-0`}>
            {event.hostImage ? (
              <img src={event.hostImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className={`text-xs ${mutedColor}`}>{event.hostName?.charAt(0)}</span>
            )}
          </div>
          <span className={`text-xs truncate ${titleColor}`}>{event.hostName}</span>
          <span className={`text-xs shrink-0 ${mutedColor}`}>· {event.goingCount} going</span>
        </div>
      </div>
    </Link>
  );
}
