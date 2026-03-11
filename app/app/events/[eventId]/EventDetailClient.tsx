"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReportButton } from "@/components/report/ReportButton";

type EventData = {
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
  channelId?: string | null;
  goingCount: number;
  myStatus: string | null;
  attendees: { userId: string; name: string; image?: string | null }[];
};

export function EventDetailClient({
  event,
  currentUserId,
}: {
  event: EventData;
  currentUserId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(event.myStatus ?? "");
  const [goingCount, setGoingCount] = useState(event.goingCount);
  const [loading, setLoading] = useState(false);
  const [channelLoading, setChannelLoading] = useState(false);

  async function handleRsvp(newStatus: string) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event._id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.status);
        setGoingCount(data.goingCount ?? goingCount);
      }
    } finally {
      setLoading(false);
    }
  }

  async function openChat() {
    if (channelLoading) return;
    setChannelLoading(true);
    try {
      const res = await fetch(`/api/events/${event._id}/ensure-channel`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.channelId) {
        const t = data.channelType ?? "messaging";
        router.push(`/app/channel/${data.channelId}?type=${t}`);
      }
    } finally {
      setChannelLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg-primary)]">
      <div className="max-w-lg mx-auto">
        <div
          className="flex items-center gap-2 p-4 border-b border-[var(--ig-border)]"
          style={{ paddingTop: "calc(1rem + var(--safe-area-inset-top))" }}
        >
          <Link href="/app/events" className="p-2 -ml-2 rounded-lg text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-[var(--ig-text)]">Event</h1>
        </div>
        {event.coverImage ? (
          <div className="aspect-[2/1] w-full bg-[var(--ig-border-light)]">
            <img src={event.coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[2/1] w-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center">
            <span className="text-5xl text-[var(--ig-text-tertiary)]">
              {event.type === "umrah" || event.type === "hajj" ? "🕋" : "📅"}
            </span>
          </div>
        )}
        <div className="p-4 space-y-4" style={{ paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))" }}>
          <p className="text-xs font-medium text-[var(--ig-link)] uppercase tracking-wide">
            {event.type}
          </p>
          <h2 className="text-xl font-semibold text-[var(--ig-text)]">
            {event.title}
          </h2>
          <div className="flex items-center gap-2 text-sm text-[var(--ig-text-secondary)]">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(event.startAt).toLocaleString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {event.endAt && ` – ${new Date(event.endAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-[var(--ig-text-secondary)]">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {event.location}
            </div>
          )}
          {event.description && (
            <p className="text-sm text-[var(--ig-text-secondary)] whitespace-pre-wrap">
              {event.description}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Link href={`/app/members/${event.hostId}`} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center overflow-hidden">
                {event.hostImage ? (
                  <img src={event.hostImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-[var(--ig-text-secondary)]">{event.hostName?.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--ig-text)]">Hosted by {event.hostName}</p>
              </div>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {["going", "interested", "declined"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleRsvp(s)}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm font-medium min-h-[44px] ${
                  status === s
                    ? "bg-[var(--ig-link)] text-white"
                    : "border border-[var(--ig-border)] text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                }`}
              >
                {s === "going" ? "Going" : s === "interested" ? "Interested" : "Not going"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openChat}
            disabled={channelLoading}
            className="w-full rounded-lg bg-[var(--ig-text)] dark:bg-[var(--ig-border-light)] text-[var(--ig-bg-primary)] py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px]"
          >
            {channelLoading ? "Opening…" : "Open event chat"}
          </button>
          <div>
            <p className="text-sm font-medium text-[var(--ig-text)] mb-2">
              {goingCount} going {event.capacity ? `· ${event.capacity} capacity` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {event.attendees.map((a) => (
                <Link key={a.userId} href={`/app/members/${a.userId}`} className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center overflow-hidden">
                    {a.image ? (
                      <img src={a.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-[var(--ig-text-secondary)]">{a.name?.charAt(0)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <ReportButton targetType="event" targetId={event._id} />
          </div>
        </div>
      </div>
    </div>
  );
}
