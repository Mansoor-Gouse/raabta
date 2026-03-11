"use client";

import Link from "next/link";
import { EliteCard } from "@/components/elite";

const EVENT_TYPES = [
  {
    kind: "private-gathering",
    label: "Private Gathering",
    description: "Intimate gatherings and dinners",
    href: "/app/events/new/create?kind=private-gathering",
    icon: "M8 7V3m8 4v4m-9 4h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    kind: "business-majlis",
    label: "Business Majlis",
    description: "Strategic business and investment discussions",
    href: "/app/events/new/create?kind=business-majlis",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    kind: "philanthropy",
    label: "Philanthropy Event",
    description: "Charity and community impact",
    href: "/app/events/new/create?kind=philanthropy",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
  {
    kind: "religious",
    label: "Religious Gathering",
    description: "Spiritual reflection and faith",
    href: "/app/events/new/create?kind=religious",
    icon: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
  },
  {
    kind: "family",
    label: "Family Event",
    description: "Family socials and celebrations",
    href: "/app/events/new/create?kind=family",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    kind: "trip-retreat",
    label: "Trip / Retreat",
    description: "Curated travel and wellness",
    href: "/app/events/new/create?kind=trip-retreat",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V3.935M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    kind: "umrah-hajj",
    label: "Umrah / Hajj Group",
    description: "Spiritual journey with the community",
    href: "/app/events/new/create?kind=umrah-hajj",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V3.935M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
] as const;

export function EventTypePicker() {
  return (
    <div className="elite-events min-h-screen bg-[var(--elite-bg)] flex flex-col">
      <header
        className="sticky top-0 z-10 shrink-0 flex flex-col px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/app/events"
            className="p-2 -ml-2 rounded-lg text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)]">
            Create an event
          </h1>
        </div>
        <p className="text-sm text-[var(--elite-text-secondary)] mt-1">
          Choose the type of experience you want to host.
        </p>
      </header>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-4 space-y-3"
        style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {EVENT_TYPES.map((item, index) => (
          <Link
            key={item.kind}
            href={item.href}
            className="block create-type-card elite-events"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <EliteCard
              className="flex items-center gap-4 p-4 hover:shadow-[var(--elite-shadow)] transition-all duration-[var(--elite-transition)] elite-hover-lift"
              as="div"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[var(--elite-border-light)] flex items-center justify-center text-[var(--elite-accent)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-[var(--elite-text)]">{item.label}</h2>
                <p className="text-sm text-[var(--elite-text-secondary)] truncate">
                  {item.description}
                </p>
              </div>
              <svg
                className="w-5 h-5 shrink-0 text-[var(--elite-text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </EliteCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
