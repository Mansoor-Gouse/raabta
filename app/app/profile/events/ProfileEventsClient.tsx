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
      <div className="flex-1 overflow-y-auto bg-[var(--ig-bg)]">
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
      <div className="flex-1 bg-[var(--ig-bg-primary)] min-h-[40vh] flex flex-col items-center justify-center px-4">
        <p className="text-sm text-[var(--ig-text-secondary)] text-center">
          No events yet. Browse and RSVP to see them here.
        </p>
        <Link
          href="/app/events"
          className="mt-4 text-sm font-semibold text-[var(--ig-link)] min-h-[44px] inline-flex items-center"
        >
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg)]">
      <ul className="p-4 space-y-4">
        {events.map((ev) => (
          <li key={ev._id}>
            <EventCard event={ev} />
          </li>
        ))}
      </ul>
    </div>
  );
}
