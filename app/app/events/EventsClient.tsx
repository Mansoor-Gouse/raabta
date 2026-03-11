"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { EventsListSkeleton } from "@/components/events/EventsListSkeleton";

type EventItem = {
  _id: string;
  title: string;
  description?: string;
  hostId: string;
  hostName: string;
  hostImage?: string | null;
  location?: string;
  startAt: string;
  endAt?: string;
  capacity?: number;
  type: string;
  coverImage?: string;
  visibility: string;
  goingCount: number;
};

export function EventsClient() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    const url = typeFilter ? `/api/events?type=${encodeURIComponent(typeFilter)}` : "/api/events";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [typeFilter]);

  if (loading) {
    return <EventsListSkeleton />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <h2 className="text-lg font-semibold text-[var(--ig-text)]">Events & Trips</h2>
        <Link
          href="/app/events/new"
          className="text-sm font-medium text-[var(--ig-link)] hover:underline min-h-[44px] flex items-center"
        >
          Create event
        </Link>
      </div>
      <div className="p-2 flex gap-2 overflow-x-auto border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)] no-scrollbar">
        {["", "event", "trip", "retreat", "umrah", "hajj"].map((t) => (
          <button
            key={t || "all"}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium min-h-[44px] flex items-center ${
              typeFilter === t
                ? "bg-[var(--ig-link)] text-white"
                : "bg-[var(--ig-border-light)] text-[var(--ig-text)]"
            }`}
          >
            {t || "All"}
          </button>
        ))}
      </div>
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <p className="text-sm text-[var(--ig-text-secondary)] text-center mb-4">
            No upcoming events. Create one or check back later.
          </p>
          <Link
            href="/app/events/new"
            className="rounded-lg bg-[var(--ig-link)] text-white px-4 py-2 text-sm font-medium hover:opacity-90 min-h-[44px] inline-flex items-center justify-center"
          >
            Create event
          </Link>
        </div>
      ) : (
        <ul className="p-4 space-y-4">
          {events.map((ev) => (
            <li key={ev._id}>
              <EventCard event={ev} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
