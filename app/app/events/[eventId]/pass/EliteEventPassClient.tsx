"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trigger } from "@/lib/haptics";
import { EliteCard, EliteButton } from "@/components/elite";

type EliteEventPassClientProps = {
  eventId: string;
  eventTitle: string;
  eventLocation?: string;
  eventDate: string;
  userName: string;
  vipTag: boolean;
};

export function EliteEventPassClient({
  eventId,
  eventTitle,
  eventLocation,
  eventDate,
  userName,
  vipTag,
}: EliteEventPassClientProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/pass`)
      .then((r) => r.json())
      .then((data) => {
        if (data.token) setToken(data.token);
        else setError(data.error || "Could not load pass");
      })
      .catch(() => setError("Could not load pass"))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
        <header
          className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
          style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
        >
          <div className="h-10 w-10 rounded-lg bg-[var(--elite-border)] animate-pulse" />
          <div className="h-6 w-24 rounded bg-[var(--elite-border)] animate-pulse" />
        </header>
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-6 space-y-4 animate-pulse">
            <div className="h-5 w-3/4 rounded bg-[var(--elite-border)] mx-auto" />
            <div className="h-4 w-1/2 rounded bg-[var(--elite-border)] mx-auto" />
            <div className="h-32 w-32 rounded-lg bg-[var(--elite-border)] mx-auto" />
            <div className="h-4 w-24 rounded bg-[var(--elite-border)] mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col items-center justify-center p-4">
        <p className="text-[var(--elite-error)] mb-4">{error || "Pass not available"}</p>
        <Link href={`/app/events/${eventId}`} onClick={() => trigger("light")}>
          <EliteButton variant="primary">Back to event</EliteButton>
        </Link>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(token)}`;

  return (
    <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <Link
          href={`/app/events/${eventId}`}
          onClick={() => trigger("light")}
          className="p-2 -ml-2 rounded-lg text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)]">Event pass</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        <EliteCard accent className="w-full max-w-sm text-center">
          <h2 className="elite-heading text-lg font-semibold text-[var(--elite-card-text)]">
            {eventTitle}
          </h2>
          <p className="text-sm text-[var(--elite-text-muted)] mt-1">
            {new Date(eventDate).toLocaleString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {eventLocation && (
            <p className="text-sm text-[var(--elite-text-muted)]">{eventLocation}</p>
          )}
          <div className="flex justify-center my-4">
            <img src={qrUrl} alt="QR code for check-in" className="w-48 h-48 rounded-lg bg-white p-2" />
          </div>
          <p className="font-medium text-[var(--elite-card-text)]">{userName}</p>
          {vipTag && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-[var(--elite-accent)] text-[var(--elite-on-accent)]">
              VIP
            </span>
          )}
          <p className="text-xs text-[var(--elite-text-muted)] mt-3">
            Show this pass at the door for check-in.
          </p>
          <div className="mt-4 pt-4 border-t border-[var(--elite-border)]">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-sm font-medium text-[var(--elite-accent)] hover:underline inline-flex items-center gap-2"
              aria-label="Add to Apple Wallet or Google Wallet (coming soon)"
            >
              Add to Wallet
              <span className="text-xs text-[var(--elite-text-muted)]">(Coming soon)</span>
            </a>
          </div>
        </EliteCard>
      </div>
    </div>
  );
}
