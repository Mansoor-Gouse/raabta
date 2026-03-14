"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventCard, type EventCardEvent } from "@/components/events/EventCard";
import { EventCardSkeleton } from "@/components/events/EventsListSkeleton";

export function ProfileEventsClient() {
  const [events, setEvents] = useState<EventCardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events?attending=me")
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-[var(--elite-bg)] no-scrollbar">
        <ul className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <li key={i}>
              <EventCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex-1 bg-[var(--elite-bg)] min-h-[40vh] flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--elite-border)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={2} />
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} />
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} />
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} />
          </svg>
        </div>
        <p className="elite-heading font-semibold text-[var(--elite-text)] text-lg">No events yet</p>
        <p className="elite-body text-sm text-[var(--elite-text-secondary)] text-center mt-1">
          Browse and RSVP to see them here.
        </p>
        <Link
          href="/app/events"
          className="elite-events mt-4 inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-[var(--elite-radius)] text-sm font-medium bg-[var(--elite-accent)] text-[var(--elite-on-accent)] hover:bg-[var(--elite-accent-hover)] border border-[var(--elite-accent)] transition-colors duration-[var(--elite-transition)]"
        >
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--elite-bg)] no-scrollbar">
      <ul className="p-4 space-y-4">
        {events.map((ev) => (
          <li key={ev._id}>
            <EventCard event={ev} variant="elite" />
          </li>
        ))}
      </ul>
    </div>
  );
}
