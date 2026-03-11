"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EliteCard, EliteButton, EliteChip } from "@/components/elite";
import { trigger } from "@/lib/haptics";

type EliteTripClientProps = {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  isHost?: boolean;
};

type DestinationOption = { name: string; votes: number };

const DESTINATION_PRESETS = ["Dubai", "Maldives", "Istanbul", "London", "Riyadh", "Jeddah", "Bali", "Swiss Alps"];

const ACTIVITY_PRESETS = [
  { name: "Dinner", date: "" },
  { name: "Sightseeing", date: "" },
  { name: "Prayer", date: "" },
  { name: "Networking", date: "" },
  { name: "Beach", date: "" },
  { name: "Spa", date: "" },
];

function formatDeadline(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function EliteTripClient({
  eventId,
  eventTitle,
  eventDate,
  isHost = false,
}: EliteTripClientProps) {
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [myVotedIndices, setMyVotedIndices] = useState<number[]>([]);
  const [selectedHotel, setSelectedHotel] = useState("");
  const [activities, setActivities] = useState<{ name: string; date?: string }[]>([]);
  const [newDestination, setNewDestination] = useState("");
  const [votingDeadline, setVotingDeadline] = useState<string | null>(null);
  const [decidedDestination, setDecidedDestination] = useState<string | null>(null);
  const [votingClosed, setVotingClosed] = useState(false);
  const [activitiesPublishedAt, setActivitiesPublishedAt] = useState<string | null>(null);
  const [isHostFromApi, setIsHostFromApi] = useState(isHost);
  const [finalizing, setFinalizing] = useState(false);
  const [publishingActivities, setPublishingActivities] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<{ days: number; hours: number } | null>(null);
  const [newActivityName, setNewActivityName] = useState("");
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
  const [editingActivityName, setEditingActivityName] = useState("");
  const [editingActivityDate, setEditingActivityDate] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const ICON_BTN =
    "trip-plan-icon-btn p-1.5 rounded-md border border-[var(--elite-border)] bg-[var(--elite-surface)] hover:bg-[var(--elite-border-light)] focus:outline focus:ring-2 focus:ring-[var(--elite-accent)] disabled:opacity-50 [&>svg]:shrink-0";
  const ICON_BTN_DANGER =
    "trip-plan-icon-btn-danger p-1.5 rounded-md border border-[var(--elite-border)] bg-[var(--elite-surface)] hover:bg-[var(--elite-border-light)] focus:outline focus:ring-2 focus:ring-[var(--elite-accent)] disabled:opacity-50 [&>svg]:shrink-0";

  function load() {
    fetch(`/api/events/${eventId}/trip`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setDestinations(data.destinationOptions || []);
        setMyVotedIndices(data.myVotedIndices || []);
        setSelectedHotel(data.selectedHotel || "");
        setActivities(data.activities || []);
        setVotingDeadline(data.votingDeadline || null);
        setDecidedDestination(data.decidedDestination || null);
        setVotingClosed(data.votingClosed ?? false);
        setActivitiesPublishedAt(data.activitiesPublishedAt ?? null);
        setIsHostFromApi(data.isHost ?? isHost);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!votingDeadline || votingClosed || decidedDestination) {
      setCountdown(null);
      return;
    }
    function update() {
      if (!votingDeadline) return;
      const end = new Date(votingDeadline).getTime();
      const now = Date.now();
      if (now >= end) {
        setCountdown(null);
        load();
        return;
      }
      const d = Math.floor((end - now) / (24 * 60 * 60 * 1000));
      const h = Math.floor(((end - now) % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      setCountdown({ days: d, hours: h });
    }
    update();
    const t = setInterval(update, 60 * 1000);
    return () => clearInterval(t);
  }, [votingDeadline, votingClosed, decidedDestination]);

  useEffect(() => {
    load();
  }, [eventId]);

  async function addDestination() {
    if (!newDestination.trim()) return;
    trigger("light");
    await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_destination", destinationName: newDestination.trim() }),
    });
    setNewDestination("");
    load();
  }

  async function toggleVote(index: number) {
    const opt = destinations[index];
    if (!opt) return;
    trigger("light");
    const wasVoted = myVotedIndices.includes(index);
    setMyVotedIndices((prev) => (wasVoted ? prev.filter((i) => i !== index) : [...prev, index]));
    setDestinations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], votes: next[index].votes + (wasVoted ? -1 : 1) };
      return next;
    });
    const res = await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", destinationIndex: index }),
    });
    if (!res.ok) load();
  }

  async function saveHotel() {
    trigger("light");
    await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotel: selectedHotel }),
    });
    load();
  }

  async function addDestinationPreset(name: string) {
    if (destinations.some((d) => d.name.toLowerCase() === name.toLowerCase())) return;
    trigger("light");
    await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_destination", destinationName: name }),
    });
    load();
  }

  async function addActivityPreset(name: string) {
    trigger("light");
    await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_activity", activityName: name }),
    });
    load();
  }

  async function setVotingDeadlineTo(iso: string) {
    if (!isHostFromApi || savingDeadline) return;
    trigger("light");
    setSavingDeadline(true);
    try {
      const res = await fetch(`/api/events/${eventId}/trip`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_voting_deadline", votingDeadline: iso }),
      });
      const data = await res.json();
      if (res.ok && data.votingDeadline) {
        setVotingDeadline(data.votingDeadline);
        setShowDeadlinePicker(false);
        setDeadlineInput("");
        load();
      }
    } finally {
      setSavingDeadline(false);
    }
  }

  async function handleFinalize(destinationIndex: number) {
    const opt = destinations[destinationIndex];
    if (!opt || finalizing) return;
    trigger("light");
    setFinalizing(true);
    try {
      const res = await fetch(`/api/events/${eventId}/trip`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", destinationIndex }),
      });
      const data = await res.json();
      if (res.ok) {
        setDecidedDestination(data.decidedDestination ?? opt.name);
        load();
      }
    } finally {
      setFinalizing(false);
    }
  }

  const hostCanFinalize = isHostFromApi && !votingClosed && !decidedDestination && destinations.length > 0;
  const activitiesLocked = !!activitiesPublishedAt;

  async function handlePublishActivities() {
    if (!isHostFromApi || activitiesLocked || publishingActivities) return;
    trigger("light");
    setPublishingActivities(true);
    try {
      const res = await fetch(`/api/events/${eventId}/trip`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_activities" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActivitiesPublishedAt(data.activitiesPublishedAt ?? new Date().toISOString());
        load();
      }
    } finally {
      setPublishingActivities(false);
    }
  }

  async function deleteDestination(index: number) {
    if (!isHostFromApi || votingClosed || decidedDestination) return;
    trigger("light");
    const res = await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_destination", destinationIndex: index }),
    });
    if (res.ok) load();
  }

  async function addCustomActivity() {
    if (!newActivityName.trim() || activitiesLocked) return;
    trigger("light");
    const res = await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_activity", activityName: newActivityName.trim() }),
    });
    if (res.ok) {
      setNewActivityName("");
      load();
    }
  }

  async function deleteActivity(index: number) {
    if (activitiesLocked) return;
    trigger("light");
    const res = await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_activity", activityIndex: index }),
    });
    if (res.ok) {
      setEditingActivityIndex(null);
      load();
    }
  }

  async function saveActivityEdit(index: number) {
    if (activitiesLocked || !editingActivityName.trim()) return;
    trigger("light");
    const res = await fetch(`/api/events/${eventId}/trip`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_activity",
        activityIndex: index,
        activityName: editingActivityName.trim(),
        activityDate: editingActivityDate || undefined,
      }),
    });
    if (res.ok) {
      setEditingActivityIndex(null);
      setEditingActivityName("");
      setEditingActivityDate("");
      load();
    }
  }

  function startEditActivity(index: number) {
    const a = activities[index];
    if (a) {
      trigger("light");
      setEditingActivityIndex(index);
      setEditingActivityName(a.name);
      setEditingActivityDate(a.date || "");
    }
  }
  const leadingIndex = destinations.length > 0
    ? destinations.reduce((best, cur, i) => (cur.votes > (destinations[best]?.votes ?? -1) ? i : best), 0)
    : -1;
  const leading = leadingIndex >= 0 ? destinations[leadingIndex] : null;

  if (loading) {
    return (
      <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]" style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}>
          <div className="h-8 w-8 rounded-lg bg-[var(--elite-border)] animate-pulse" />
          <div className="h-4 w-24 rounded bg-[var(--elite-border)] animate-pulse" />
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="h-4 w-48 rounded bg-[var(--elite-border)] animate-pulse" />
          <div className="rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-4 space-y-3 animate-pulse">
            <div className="h-4 w-32 rounded bg-[var(--elite-border)]" />
            <div className="h-10 w-full rounded bg-[var(--elite-border)]" />
            <div className="h-8 w-full rounded bg-[var(--elite-border)]" />
          </div>
          <div className="rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-4 space-y-2 animate-pulse">
            <div className="h-4 w-20 rounded bg-[var(--elite-border)]" />
            <div className="h-10 w-full rounded bg-[var(--elite-border)]" />
          </div>
          <div className="rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-4 space-y-2 animate-pulse">
            <div className="h-4 w-24 rounded bg-[var(--elite-border)]" />
            <div className="h-6 w-full rounded bg-[var(--elite-border)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] shrink-0 transition-colors duration-[var(--elite-transition)]"
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
        <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)]">Trip plan</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <p className="text-xs text-[var(--elite-text-muted)]">
          {eventTitle} · {new Date(eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>

        <EliteCard>
          <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1">Where we&apos;re going</h3>
          <p className="text-xs text-[var(--elite-text-muted)] mb-2">
            Vote for one destination. Host can finalize the result. All confirmed attendees can vote.
          </p>
          {votingClosed ? (
            <p className="text-xs text-[var(--elite-text-muted)] mb-2">Voting closed.</p>
          ) : countdown != null ? (
            <p className="text-xs font-medium text-[var(--elite-accent)] mb-2">
              Voting closes in {countdown.days}d {countdown.hours}h
            </p>
          ) : votingDeadline ? (
            <p className="text-xs text-[var(--elite-text-secondary)] mb-2">
              Voting closes: {formatDeadline(votingDeadline)}
            </p>
          ) : null}
          {decidedDestination && (
            <div className="mb-3 rounded-lg border border-[var(--elite-accent-muted)] bg-[var(--elite-surface)] px-3 py-2">
              <span className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide">Decided</span>
              <p className="elite-heading text-sm font-semibold text-[var(--elite-text)] mt-0.5">{decidedDestination}</p>
            </div>
          )}
          {!decidedDestination && leading && (
            <p className="text-xs text-[var(--elite-text-secondary)] mb-2">
              Leading: <span className="font-medium text-[var(--elite-text)]">{leading.name}</span> ({leading.votes} vote{leading.votes !== 1 ? "s" : ""})
            </p>
          )}
          {isHostFromApi && !decidedDestination && (
            <div className="mb-3 p-2 rounded-lg border border-[var(--elite-border)] bg-[var(--elite-surface)]">
              <p className="text-xs font-medium text-[var(--elite-text-muted)] mb-1.5">Voting end time (organizer)</p>
              {!showDeadlinePicker ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-[var(--elite-text)]">
                    {votingDeadline ? formatDeadline(votingDeadline) : "Not set (default: 7 days before event)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeadlinePicker(true);
                      setDeadlineInput(votingDeadline ? votingDeadline.slice(0, 16) : "");
                    }}
                    className="text-xs font-medium text-[var(--elite-accent)] hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { label: "+1 week", getDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
                      { label: "+2 weeks", getDate: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
                      { label: "+1 month", getDate: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                    ].map(({ label, getDate }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setVotingDeadlineTo(getDate().toISOString())}
                        disabled={savingDeadline}
                        className="elite-events px-2.5 py-1 rounded-md border border-[var(--elite-border)] bg-[var(--elite-surface)] text-sm text-[var(--elite-accent)] hover:bg-[var(--elite-border-light)] disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <input
                      type="datetime-local"
                      value={deadlineInput}
                      onChange={(e) => setDeadlineInput(e.target.value)}
                      className="elite-events min-h-[34px] rounded border border-[var(--elite-border)] bg-[var(--elite-bg)] px-2 py-1 text-sm text-[var(--elite-text)]"
                    />
                    <button
                      type="button"
                      onClick={() => deadlineInput && setVotingDeadlineTo(new Date(deadlineInput).toISOString())}
                      disabled={savingDeadline || !deadlineInput}
                      className={ICON_BTN}
                      aria-label="Save deadline"
                      title="Save"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDeadlinePicker(false); setDeadlineInput(""); }}
                      className="text-xs text-[var(--elite-text-muted)] hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DESTINATION_PRESETS.map((name) => (
              <EliteChip
                key={name}
                selected={destinations.some((d) => d.name.toLowerCase() === name.toLowerCase())}
                haptic="light"
                onClick={() => !votingClosed && addDestinationPreset(name)}
              >
                {name}
              </EliteChip>
            ))}
          </div>
          <div className="flex gap-1.5 mb-3">
            <input
              type="text"
              value={newDestination}
              onChange={(e) => setNewDestination(e.target.value)}
              placeholder="Add destination"
              className="elite-events flex-1 min-h-[34px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2.5 py-1.5 text-sm text-[var(--elite-text)] placeholder:text-[var(--elite-text-muted)]"
            />
            <button
              type="button"
              onClick={addDestination}
              disabled={votingClosed || !newDestination.trim()}
              className={`${ICON_BTN} trip-plan-icon-btn-filled border-[var(--elite-accent-muted)] bg-[var(--elite-accent)] text-white hover:bg-[var(--elite-accent)]`}
              aria-label="Add destination"
              title="Add"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <ul className="space-y-0">
            {destinations.map((opt, i) => (
              <li key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--elite-border)] last:border-0">
                <span className="text-sm text-[var(--elite-card-text)] truncate min-w-0">{opt.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-[var(--elite-text-muted)] w-8 text-right">{opt.votes}</span>
                  {!votingClosed && !decidedDestination && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleVote(i)}
                        className={ICON_BTN}
                        aria-label={myVotedIndices.includes(i) ? "Remove vote" : "Vote"}
                        title={myVotedIndices.includes(i) ? "Voted" : "Vote"}
                      >
                        {myVotedIndices.includes(i) ? (
                          <svg className="w-4 h-4 text-[var(--elite-accent)]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                        )}
                      </button>
                      {isHostFromApi && (
                        <button type="button" onClick={() => handleFinalize(i)} disabled={finalizing} className={`${ICON_BTN} flex items-center gap-1`} aria-label="Finalize this destination" title="Finalize">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-xs font-medium">Finalize</span>
                        </button>
                      )}
                      {isHostFromApi && (
                        <button type="button" onClick={() => deleteDestination(i)} className={ICON_BTN_DANGER} aria-label="Remove destination" title="Remove">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </EliteCard>

        <EliteCard>
          <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1">Hotel</h3>
          <p className="text-xs text-[var(--elite-text-muted)] mb-2">Agreed accommodation or booking link.</p>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={selectedHotel}
              onChange={(e) => setSelectedHotel(e.target.value)}
              onBlur={saveHotel}
              placeholder="Hotel or link"
              className="elite-events flex-1 min-h-[34px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2.5 py-1.5 text-sm text-[var(--elite-text)] placeholder:text-[var(--elite-text-muted)]"
            />
            <button type="button" onClick={saveHotel} className={ICON_BTN} aria-label="Save" title="Save">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </button>
          </div>
        </EliteCard>

        <EliteCard>
          <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1">Activities</h3>
          {activitiesLocked ? (
            <>
              <p className="text-xs text-[var(--elite-text-muted)] mb-2">Published by host · read-only</p>
              {activities.length === 0 ? (
                <p className="text-sm text-[var(--elite-text-muted)]">No activities.</p>
              ) : (
                <ul className="space-y-1.5">
                  {activities.map((a, i) => (
                    <li key={i} className="text-sm text-[var(--elite-card-text)] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--elite-accent-muted)] shrink-0" aria-hidden />
                      {a.date && <span className="text-xs text-[var(--elite-text-muted)] shrink-0">{a.date}</span>}
                      <span>{a.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-[var(--elite-text-muted)] mb-2">Tap a chip or add custom (organizer). Host can publish to lock.</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ACTIVITY_PRESETS.map(({ name }) => (
                  <EliteChip key={name} haptic="light" onClick={() => addActivityPreset(name)}>{name}</EliteChip>
                ))}
              </div>
              {isHostFromApi && (
                <div className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    placeholder="Custom activity"
                    className="elite-events flex-1 min-h-[34px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2.5 py-1.5 text-sm text-[var(--elite-text)] placeholder:text-[var(--elite-text-muted)]"
                  />
                  <button type="button" onClick={addCustomActivity} disabled={!newActivityName.trim()} className={`${ICON_BTN} trip-plan-icon-btn-filled border-[var(--elite-accent-muted)] bg-[var(--elite-accent)] text-white`} aria-label="Add activity" title="Add">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              )}
              {isHostFromApi && (
                <button type="button" onClick={handlePublishActivities} disabled={publishingActivities} className={`${ICON_BTN} mb-3`} aria-label={publishingActivities ? "Publishing…" : "Publish activities (lock)"} title="Publish activities">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </button>
              )}
              {activities.length === 0 ? (
                <p className="text-sm text-[var(--elite-text-muted)]">No activities yet.</p>
              ) : (
                <ul className="space-y-0">
                  {activities.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 py-1.5 border-b border-[var(--elite-border)] last:border-0">
                      {editingActivityIndex === i ? (
                        <>
                          <input
                            type="text"
                            value={editingActivityName}
                            onChange={(e) => setEditingActivityName(e.target.value)}
                            className="elite-events flex-1 min-h-[32px] rounded border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-1 text-sm"
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            value={editingActivityDate}
                            onChange={(e) => setEditingActivityDate(e.target.value)}
                            className="elite-events w-24 min-h-[32px] rounded border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-1 text-xs"
                            placeholder="Date"
                          />
                          <button type="button" onClick={() => saveActivityEdit(i)} className={ICON_BTN} aria-label="Save" title="Save">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button type="button" onClick={() => { setEditingActivityIndex(null); setEditingActivityName(""); setEditingActivityDate(""); }} className={ICON_BTN} aria-label="Cancel" title="Cancel">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[var(--elite-accent-muted)] shrink-0" aria-hidden />
                          {a.date && <span className="text-xs text-[var(--elite-text-muted)] w-16 shrink-0">{a.date}</span>}
                          <span className="text-sm text-[var(--elite-card-text)] flex-1 min-w-0 truncate">{a.name}</span>
                          {isHostFromApi && (
                            <>
                              <button type="button" onClick={() => startEditActivity(i)} className={ICON_BTN} aria-label="Edit" title="Edit">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                            <button type="button" onClick={() => deleteActivity(i)} className={ICON_BTN_DANGER} aria-label="Delete" title="Delete">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            </>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </EliteCard>
      </div>
    </div>
  );
}
