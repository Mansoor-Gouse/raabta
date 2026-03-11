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
};

export function EventCard({ event, compact = false }: EventCardProps) {
  return (
    <Link
      href={`/app/events/${event._id}`}
      className="block rounded-xl border border-[var(--ig-border)] overflow-hidden bg-[var(--ig-bg-primary)] hover:border-[var(--ig-text-tertiary)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--ig-link)]"
    >
      {event.coverImage ? (
        <div className="aspect-[2/1] bg-[var(--ig-border-light)]">
          <img
            src={event.coverImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[2/1] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center">
          <span className="text-4xl text-[var(--ig-text-tertiary)]">
            {event.type === "umrah" || event.type === "hajj" ? "🕋" : "📅"}
          </span>
        </div>
      )}
      <div className={compact ? "p-3" : "p-4"}>
        <p className="text-xs font-medium text-[var(--ig-link)] uppercase tracking-wide">
          {event.type}
        </p>
        <h3 className="font-semibold text-[var(--ig-text)] mt-0.5">
          {event.title}
        </h3>
        <p className="text-sm text-[var(--ig-text-secondary)] mt-1">
          {new Date(event.startAt).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {event.location && ` · ${event.location}`}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center overflow-hidden shrink-0">
            {event.hostImage ? (
              <img src={event.hostImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-[var(--ig-text-secondary)]">{event.hostName?.charAt(0)}</span>
            )}
          </div>
          <span className="text-xs text-[var(--ig-text)] truncate">{event.hostName}</span>
          <span className="text-xs text-[var(--ig-text-secondary)] shrink-0">· {event.goingCount} going</span>
        </div>
      </div>
    </Link>
  );
}
