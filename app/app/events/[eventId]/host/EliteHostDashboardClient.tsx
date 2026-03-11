"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EliteCard, EliteButton, EliteAvatar, EliteChip, EliteInput } from "@/components/elite";
import { trigger } from "@/lib/haptics";

type EliteHostDashboardClientProps = {
  eventId: string;
  eventTitle: string;
  initialStatus?: string;
  /** When false, Trip tab and trip planner are hidden (e.g. for invite-only events) */
  showTripModule?: boolean;
};

type Guest = {
  userId: string;
  name: string;
  image?: string | null;
  vipTag?: boolean;
  requestNote?: string;
  headline?: string;
  location?: string;
  networkingIntent?: string;
  attendedEventsCount?: number;
  mutualConnectionsCount?: number;
  guestTier?: string;
};

const EVENT_STATUS_OPTIONS = ["active", "cancelled", "postponed"] as const;

const TABS_ALL = ["Overview", "Guests", "Seating", "Trip", "Analytics"] as const;
type Tab = (typeof TABS_ALL)[number];

export function EliteHostDashboardClient({
  eventId,
  eventTitle,
  initialStatus = "active",
  showTripModule = true,
}: EliteHostDashboardClientProps) {
  const tabs = showTripModule ? [...TABS_ALL] : TABS_ALL.filter((t) => t !== "Trip");
  const [tab, setTab] = useState<Tab>("Overview");
  const [status, setStatus] = useState(initialStatus);
  const [accepted, setAccepted] = useState<Guest[]>([]);
  const [pending, setPending] = useState<Guest[]>([]);
  const [waitlisted, setWaitlisted] = useState<Guest[]>([]);
  const [declined, setDeclined] = useState<{ userId: string; name: string; image?: string | null }[]>([]);
  const [invited, setInvited] = useState<Guest[]>([]);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteSearchResults, setInviteSearchResults] = useState<{ _id: string; fullName?: string; name?: string; headline?: string; location?: string }[]>([]);
  const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [actingRequestUserId, setActingRequestUserId] = useState<string | null>(null);
  const [actingTierUserId, setActingTierUserId] = useState<string | null>(null);
  const [actingRemoveUserId, setActingRemoveUserId] = useState<string | null>(null);
  const [guestActionError, setGuestActionError] = useState<string | null>(null);

  function load() {
    fetch(`/api/events/${eventId}/guests`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setAccepted(data.accepted || []);
        setPending(data.pending || []);
        setWaitlisted(data.waitlisted || []);
        setDeclined(data.declined || []);
        setInvited(data.invited || []);
        setCapacity(data.capacity ?? null);
        setCheckedInCount(data.checkedInCount ?? 0);
      })
      .finally(() => setLoading(false));
  }

  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setInviteSearchResults([]);
      return;
    }
    setInviteSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=users&limit=15`, { credentials: "include" });
      const data = await res.json();
      setInviteSearchResults(Array.isArray(data.users) ? data.users : []);
    } catch {
      setInviteSearchResults([]);
    } finally {
      setInviteSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchMembers(inviteSearchQuery), 300);
    return () => clearTimeout(t);
  }, [inviteSearchQuery, searchMembers]);

  useEffect(() => {
    load();
  }, [eventId]);

  if (loading) {
    return (
      <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
        <header
          className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
          style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
        >
          <div className="h-10 w-10 rounded-lg bg-[var(--elite-border)] animate-pulse" />
          <div className="h-6 w-32 rounded bg-[var(--elite-border)] animate-pulse" />
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="h-4 w-48 rounded bg-[var(--elite-border)] animate-pulse" />
          <div className="flex gap-2 border-b border-[var(--elite-border)] pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-[var(--elite-border)] animate-pulse" />
            ))}
          </div>
          <div className="rounded-[var(--elite-radius)] border border-[var(--elite-border)] p-4 space-y-3 animate-pulse">
            <div className="h-4 w-24 rounded bg-[var(--elite-border)]" />
            <div className="h-2 w-full rounded bg-[var(--elite-border)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[var(--elite-radius)] border border-[var(--elite-border)] p-4 h-20 animate-pulse">
                <div className="h-4 w-20 rounded bg-[var(--elite-border)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  async function handleRequest(userId: string, action: "approve" | "reject") {
    trigger("light");
    setGuestActionError(null);
    setActingRequestUserId(userId);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGuestActionError(data?.error || data?.message || "Request failed.");
        trigger("error");
      } else {
        trigger("success");
        load();
      }
    } finally {
      setActingRequestUserId(null);
    }
  }

  async function handleSetTier(userId: string, guestTier: string | null) {
    trigger("light");
    setGuestActionError(null);
    setActingTierUserId(userId);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "setTier", guestTier: guestTier || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGuestActionError(data?.error || data?.message || "Failed to update tier.");
        trigger("error");
      } else {
        trigger("success");
        load();
      }
    } finally {
      setActingTierUserId(null);
    }
  }

  async function handleRemoveGuest(userId: string) {
    if (typeof window !== "undefined" && !window.confirm("Remove this guest from the event? They will be notified.")) return;
    trigger("light");
    setGuestActionError(null);
    setActingRemoveUserId(userId);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "remove" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGuestActionError(data?.error || data?.message || "Failed to remove guest.");
        trigger("error");
      } else {
        trigger("success");
        load();
      }
    } finally {
      setActingRemoveUserId(null);
    }
  }

  async function handleInviteMembers(userIds: string[]) {
    if (userIds.length === 0) return;
    trigger("light");
    setInviteSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", userIds }),
      });
      const data = await res.json().catch(() => ({}));
      setInviteSearchQuery("");
      setInviteSearchResults([]);
      load();
      if (!res.ok) {
        trigger("error");
        const msg = data?.error || data?.message || "Failed to send invites.";
        if (typeof window !== "undefined") window.alert(msg);
      } else if (data?.invited > 0) {
        trigger("success");
        if (typeof window !== "undefined") window.alert(`Invitation sent to ${data.invited} member${data.invited !== 1 ? "s" : ""}.`);
      }
    } finally {
      setInviteSending(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (statusSaving || newStatus === status) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setStatus(newStatus);
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <Link
          href={`/app/events/${eventId}`}
          onClick={() => trigger("light")}
          className="p-2 -ml-2 rounded-lg text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)] truncate">Manage event</h1>
          <p className="text-xs text-[var(--elite-text-muted)] truncate mt-0.5">{eventTitle}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))" }}>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--elite-border)] pb-2 -mx-0.5">
          {tabs.map((t) => (
            <EliteChip key={t} selected={tab === t} haptic="light" onClick={() => setTab(t)}>
              {t}
            </EliteChip>
          ))}
        </div>

        {tab === "Overview" && (
          <div className="space-y-4">
            {(status === "cancelled" || status === "postponed") && (
              <div
                className="rounded-[var(--elite-radius)] px-4 py-3 text-center font-medium text-white"
                style={{
                  backgroundColor: status === "cancelled" ? "var(--elite-error, #ed4956)" : "var(--elite-text-muted)",
                }}
                role="alert"
              >
                Event is {status === "cancelled" ? "cancelled" : "postponed"}.
              </div>
            )}
            <EliteCard>
              <p className="text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Event status</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_STATUS_OPTIONS.map((s) => (
                  <EliteChip
                    key={s}
                    selected={status === s}
                    haptic="light"
                    onClick={() => handleStatusChange(s)}
                  >
                    {s === "active" ? "Active" : s === "cancelled" ? "Cancelled" : "Postponed"}
                  </EliteChip>
                ))}
              </div>
              {statusSaving && <p className="text-xs text-[var(--elite-text-muted)] mt-2">Updating…</p>}
            </EliteCard>
            {capacity != null && capacity > 0 && (
              <EliteCard>
                <p className="text-sm font-medium text-[var(--elite-text)] mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  {accepted.length} / {capacity} attending
                </p>
                <div className="h-2 w-full rounded-full bg-[var(--elite-border-light)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--elite-accent)] transition-all duration-200"
                    style={{ width: `${Math.min(100, (accepted.length / capacity) * 100)}%` }}
                  />
                </div>
              </EliteCard>
            )}
            <div className="grid grid-cols-2 gap-3 items-stretch">
              <Link href={`/app/events/${eventId}`} onClick={() => trigger("light")} className="block h-full">
                <EliteCard className="text-center h-full flex flex-col items-center justify-center min-h-[100px] hover:shadow-[var(--elite-shadow)] transition-all duration-[var(--elite-transition)] elite-hover-lift">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--elite-border-light)] text-[var(--elite-text)] mb-1.5 shrink-0" aria-hidden>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </span>
                  <p className="elite-heading font-semibold text-[var(--elite-card-text)]">View event</p>
                  <p className="text-xs text-[var(--elite-text-muted)] mt-0.5">Event detail</p>
                </EliteCard>
              </Link>
              <Link href={`/app/events/${eventId}/edit`} onClick={() => trigger("light")} className="block h-full">
                <EliteCard className="text-center h-full flex flex-col items-center justify-center min-h-[100px] hover:shadow-[var(--elite-shadow)] transition-all duration-[var(--elite-transition)] elite-hover-lift">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--elite-border-light)] text-[var(--elite-text)] mb-1.5 shrink-0" aria-hidden>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </span>
                  <p className="elite-heading font-semibold text-[var(--elite-card-text)]">Edit event</p>
                  <p className="text-xs text-[var(--elite-text-muted)] mt-0.5">Title, date, location, etc.</p>
                </EliteCard>
              </Link>
              <Link href={`/app/events/${eventId}/seating`} onClick={() => trigger("light")} className="block h-full">
                <EliteCard className="text-center h-full flex flex-col items-center justify-center min-h-[100px] hover:shadow-[var(--elite-shadow)] transition-all duration-[var(--elite-transition)] elite-hover-lift">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--elite-border-light)] text-[var(--elite-text)] mb-1.5 shrink-0" aria-hidden>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </span>
                  <p className="elite-heading font-semibold text-[var(--elite-card-text)]">Seating</p>
                  <p className="text-xs text-[var(--elite-text-muted)] mt-0.5">Manage tables</p>
                </EliteCard>
              </Link>
              {showTripModule && (
                <Link href={`/app/events/${eventId}/trip`} onClick={() => trigger("light")} className="block h-full">
                  <EliteCard className="text-center h-full flex flex-col items-center justify-center min-h-[100px] hover:shadow-[var(--elite-shadow)] transition-all duration-[var(--elite-transition)] elite-hover-lift">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--elite-border-light)] text-[var(--elite-text)] mb-1.5 shrink-0" aria-hidden>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    </span>
                    <p className="elite-heading font-semibold text-[var(--elite-card-text)]">Trip plan</p>
                    <p className="text-xs text-[var(--elite-text-muted)] mt-0.5">Destinations & activities</p>
                  </EliteCard>
                </Link>
              )}
            </div>
            {(pending.length > 0 || waitlisted.length > 0) && (
              <EliteCard accent>
                <p className="text-sm font-medium text-[var(--elite-text)] flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {pending.length} pending request{pending.length !== 1 ? "s" : ""}
                  {waitlisted.length > 0 && ` · ${waitlisted.length} waitlisted`}
                </p>
                <p className="text-xs text-[var(--elite-text-muted)] mt-0.5">Switch to Guests tab to approve or reject.</p>
              </EliteCard>
            )}
            <EliteCard>
              <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Host checklist
              </h3>
              <ul className="space-y-2 text-sm text-[var(--elite-card-text)]">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <Link href={`/app/events/${eventId}/seating`} onClick={() => trigger("light")} className="underline text-[var(--elite-accent)]">Finalize seating</Link>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  <Link href={`/app/events/${eventId}/edit`} onClick={() => trigger("light")} className="underline text-[var(--elite-accent)]">Edit event details</Link>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  Confirm menu
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Send reminders to invitees
                </li>
              </ul>
            </EliteCard>
          </div>
        )}

        {tab === "Guests" && (loading ? (
          <p className="text-[var(--elite-text-secondary)]">Loading…</p>
        ) : (
          <>
            {guestActionError && (
              <div
                className="rounded-[var(--elite-radius)] px-4 py-3 text-sm text-white bg-[var(--elite-error,#ed4956)]"
                role="alert"
              >
                {guestActionError}
                <button
                  type="button"
                  className="ml-2 inline-flex items-center gap-1 rounded p-1 hover:bg-white/20"
                  onClick={() => { trigger("light"); setGuestActionError(null); }}
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Dismiss
                </button>
              </div>
            )}
            <EliteCard>
              <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                Invite members
              </h3>
              <EliteInput
                placeholder="Search by name, city, profession..."
                value={inviteSearchQuery}
                onChange={(e) => setInviteSearchQuery(e.target.value)}
              />
              {inviteSearchLoading && <p className="text-xs text-[var(--elite-text-muted)] mt-1">Searching…</p>}
              {inviteSearchResults.length > 0 && (
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {inviteSearchResults.map((u) => {
                    const id = u._id;
                    const name = u.fullName || u.name || "Member";
                    const alreadyAccepted = accepted.some((a) => a.userId === id);
                    const alreadyInvited = invited.some((a) => a.userId === id);
                    const cannotInvite = alreadyAccepted || alreadyInvited;
                    return (
                      <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--elite-border)] last:border-0">
                        <span className="text-sm text-[var(--elite-text)] truncate min-w-0 flex-1">
                          {name}
                          {u.headline && <span className="text-[var(--elite-text-muted)]"> · {u.headline}</span>}
                          {u.location && <span className="text-[var(--elite-text-muted)]"> · {u.location}</span>}
                        </span>
                        <EliteButton
                          variant="secondary"
                          haptic="light"
                          onClick={() => handleInviteMembers([id])}
                          disabled={inviteSending || cannotInvite}
                          className="inline-flex items-center gap-1.5 shrink-0"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          {alreadyAccepted ? "Going" : alreadyInvited ? "Invited" : "Invite"}
                        </EliteButton>
                      </li>
                    );
                  })}
                </ul>
              )}
            </EliteCard>

            {invited.length > 0 && (
              <EliteCard>
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Invited — awaiting response ({invited.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {invited.map((g) => (
                    <EliteAvatar
                      key={g.userId}
                      name={g.name}
                      image={g.image}
                      href={`/app/members/${g.userId}`}
                      size="sm"
                      gradientFallback
                    />
                  ))}
                </div>
              </EliteCard>
            )}

            <EliteCard>
              <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Pending requests ({pending.length})
              </h3>
              {pending.length === 0 ? (
                <p className="text-sm text-[var(--elite-text-muted)]">No pending requests.</p>
              ) : (
                <ul className="space-y-3">
                  {pending.map((g) => (
                    <li key={g.userId} className="flex flex-col gap-2 rounded-lg border border-[var(--elite-border)] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <EliteAvatar name={g.name} image={g.image} href={`/app/members/${g.userId}`} size="sm" gradientFallback className="shrink-0" />
                            <span className="text-sm font-medium text-[var(--elite-card-text)] truncate min-w-0">{g.name}</span>
                          </div>
                          {(g.headline || g.location) && (
                            <p className="text-xs text-[var(--elite-text-muted)] mt-0.5">
                              {[g.headline, g.location].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {(g.attendedEventsCount != null || g.mutualConnectionsCount != null) && (
                            <p className="text-xs text-[var(--elite-text-muted)] mt-0.5">
                              Attended: {g.attendedEventsCount ?? 0} events
                              {g.mutualConnectionsCount != null && g.mutualConnectionsCount > 0 && ` · Mutual connections: ${g.mutualConnectionsCount}`}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <EliteButton
                            variant="primary"
                            onClick={() => handleRequest(g.userId, "approve")}
                            disabled={actingRequestUserId === g.userId}
                            className="shrink-0"
                          >
                            {actingRequestUserId === g.userId ? "Updating…" : "Approve"}
                          </EliteButton>
                          <EliteButton
                            variant="ghost"
                            onClick={() => handleRequest(g.userId, "reject")}
                            disabled={actingRequestUserId === g.userId}
                            className="shrink-0"
                          >
                            Reject
                          </EliteButton>
                        </div>
                      </div>
                      {g.requestNote && (
                        <p className="text-xs text-[var(--elite-text-secondary)] pl-10 border-l-2 border-[var(--elite-border-light)]">
                          Message: {g.requestNote}
                        </p>
                      )}
                      {g.networkingIntent && (
                        <p className="text-xs text-[var(--elite-text-muted)] pl-10">Networking: {g.networkingIntent}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </EliteCard>

            {waitlisted.length > 0 && (
              <EliteCard>
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Waitlist ({waitlisted.length})
                </h3>
                <p className="text-xs text-[var(--elite-text-muted)] mb-2">Offer a spot when one opens, or reject.</p>
                <ul className="space-y-0 divide-y divide-[var(--elite-border)]">
                  {waitlisted.map((g) => (
                    <li key={g.userId} className="flex flex-col gap-2 py-3 first:pt-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <EliteAvatar name={g.name} image={g.image} href={`/app/members/${g.userId}`} size="sm" gradientFallback className="shrink-0" />
                        <span className="text-sm text-[var(--elite-card-text)] truncate min-w-0">{g.name}</span>
                        {g.headline && <span className="text-xs text-[var(--elite-text-muted)] truncate hidden sm:inline">· {g.headline}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <EliteButton
                          variant="primary"
                          onClick={() => handleRequest(g.userId, "approve")}
                          disabled={actingRequestUserId === g.userId}
                          className="inline-flex items-center gap-1.5 shrink-0"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {actingRequestUserId === g.userId ? "Updating…" : "Offer spot"}
                        </EliteButton>
                        <EliteButton
                          variant="ghost"
                          onClick={() => handleRequest(g.userId, "reject")}
                          disabled={actingRequestUserId === g.userId}
                          className="inline-flex items-center gap-1.5 shrink-0"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Reject
                        </EliteButton>
                      </div>
                    </li>
                  ))}
                </ul>
              </EliteCard>
            )}

            {declined.length > 0 && (
              <EliteCard>
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Declined ({declined.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {declined.map((g) => (
                    <EliteAvatar
                      key={g.userId}
                      name={g.name}
                      image={g.image}
                      href={`/app/members/${g.userId}`}
                      size="sm"
                      gradientFallback
                    />
                  ))}
                </div>
              </EliteCard>
            )}

            <EliteCard>
              <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Accepted ({accepted.length})
              </h3>
              {accepted.length === 0 ? (
                <p className="text-sm text-[var(--elite-text-muted)]">No attendees yet.</p>
              ) : (
                <ul className="space-y-0 divide-y divide-[var(--elite-border)]">
                  {accepted.map((g) => (
                    <li key={g.userId} className="flex flex-col gap-2 py-3 first:pt-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <EliteAvatar name={g.name} image={g.image} href={`/app/members/${g.userId}`} size="sm" vip={g.vipTag} gradientFallback className="shrink-0" />
                        <span className="text-sm font-medium text-[var(--elite-card-text)] truncate min-w-0">{g.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="elite-events h-8 min-w-0 flex-1 sm:flex-none sm:min-w-[8rem] max-w-full rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 text-sm text-[var(--elite-text)] focus:outline-none focus:ring-2 focus:ring-[var(--elite-accent)]"
                          value={g.guestTier ?? ""}
                          onChange={(e) => handleSetTier(g.userId, e.target.value || null)}
                          disabled={actingTierUserId === g.userId}
                          aria-label={`Tier for ${g.name}`}
                        >
                          <option value="">Tier</option>
                          <option value="host">Host</option>
                          <option value="distinguished">Distinguished Guest</option>
                          <option value="member">Member</option>
                          <option value="family">Family Guest</option>
                        </select>
                        <EliteButton
                          variant="ghost"
                          onClick={() => handleRemoveGuest(g.userId)}
                          disabled={actingRemoveUserId === g.userId}
                          className="inline-flex items-center gap-1.5 shrink-0"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          {actingRemoveUserId === g.userId ? "…" : "Remove"}
                        </EliteButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </EliteCard>
          </>
        ))}

        {tab === "Seating" && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--elite-text-muted)] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Manage table assignments for your event.
            </p>
            <Link href={`/app/events/${eventId}/seating`} onClick={() => trigger("light")}>
              <EliteButton variant="primary" fullWidth className="inline-flex items-center justify-center gap-2 w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Open seating plan
              </EliteButton>
            </Link>
          </div>
        )}

        {tab === "Trip" && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--elite-text-muted)] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              Collaborate on destinations and activities.
            </p>
            <Link href={`/app/events/${eventId}/trip`} onClick={() => trigger("light")}>
              <EliteButton variant="primary" fullWidth className="inline-flex items-center justify-center gap-2 w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Open trip planner
              </EliteButton>
            </Link>
          </div>
        )}

        {tab === "Analytics" && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--elite-text-muted)] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Key counts for your event.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <EliteCard>
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Attending
                </p>
                <p className="elite-heading text-2xl font-semibold text-[var(--elite-text)] mt-0.5">{accepted.length}</p>
              </EliteCard>
              <EliteCard>
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Invited
                </p>
                <p className="elite-heading text-2xl font-semibold text-[var(--elite-text)] mt-0.5">{invited.length}</p>
              </EliteCard>
              <EliteCard>
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Pending requests
                </p>
                <p className="elite-heading text-2xl font-semibold text-[var(--elite-text)] mt-0.5">{pending.length}</p>
              </EliteCard>
              <EliteCard>
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Waitlist
                </p>
                <p className="elite-heading text-2xl font-semibold text-[var(--elite-text)] mt-0.5">{waitlisted.length}</p>
              </EliteCard>
              <EliteCard>
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Declined
                </p>
                <p className="elite-heading text-2xl font-semibold text-[var(--elite-text)] mt-0.5">{declined.length}</p>
              </EliteCard>
              <EliteCard>
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Checked in
                </p>
                <p className="elite-heading text-2xl font-semibold text-[var(--elite-text)] mt-0.5">{checkedInCount}</p>
              </EliteCard>
              {capacity != null && capacity > 0 && (
                <EliteCard>
                  <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Capacity
                  </p>
                  <p className="elite-heading text-2xl font-semibold text-[var(--elite-text)] mt-0.5">{capacity} {accepted.length <= capacity ? "" : "(full)"}</p>
                </EliteCard>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
