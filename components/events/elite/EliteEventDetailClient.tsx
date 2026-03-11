"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReportButton } from "@/components/report/ReportButton";
import {
  EliteCard,
  EliteButton,
  EliteChip,
  EliteAvatar,
} from "@/components/elite";
import { trigger as hapticTrigger } from "@/lib/haptics";
import { getMeetingPlatform, MeetingPlatformIcon } from "@/components/events/meetingPlatforms";

const ACTION_TILE_CLASS =
  "elite-events flex flex-col items-center justify-center gap-1 min-w-[64px] shrink-0 min-h-[64px] rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-surface)] hover:border-[var(--elite-accent-muted)] hover:bg-[var(--elite-border-light)] hover:shadow-[var(--elite-shadow)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[var(--elite-transition)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)]";

export type EliteEventDetailData = {
  _id: string;
  title: string;
  description?: string;
  hostId: string;
  hostName: string;
  hostImage?: string | null;
  location?: string;
  venue?: string;
  eventFormat?: "online" | "offline";
  meetingLink?: string;
  meetingDetails?: string;
  meetingPlatform?: string;
  startAt: string;
  endAt?: string;
  capacity?: number;
  type: string;
  coverImage?: string;
  visibility: string;
  channelId?: string | null;
  channelType?: "messaging" | "team" | null;
  category?: string;
  dressCode?: string;
  etiquette?: string;
  halalMenuDetails?: string;
  prayerFacilityInfo?: string;
  allowGuestRequest?: boolean;
  allowBringGuest?: boolean;
  status?: "active" | "cancelled" | "postponed";
  audienceType?: string;
  goingCount: number;
  myStatus: string | null;
  myVipTag?: boolean;
  myNetworkingIntent?: string | null;
  hostEventsCount?: number;
  attendees: { userId: string; name: string; image?: string | null; vipTag?: boolean; networkingIntent?: string | null }[];
};

const NETWORKING_OPTIONS = [
  { value: "business", label: "Business" },
  { value: "philanthropy", label: "Philanthropy" },
  { value: "social", label: "Social" },
] as const;

export function EliteEventDetailClient({
  event,
  currentUserId,
  isHost,
}: {
  event: EliteEventDetailData;
  currentUserId: string;
  isHost?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(event.myStatus ?? "");
  const [goingCount, setGoingCount] = useState(event.goingCount);
  const [loading, setLoading] = useState(false);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  /** Prefetched in background so opening chat is instant */
  const [prefetchedChannelId, setPrefetchedChannelId] = useState<string | null>(event.channelId ?? null);
  const [prefetchedChannelType, setPrefetchedChannelType] = useState<"messaging" | "team">(event.channelType ?? "messaging");
  const [requestNote, setRequestNote] = useState("");
  const [showAcceptedConfirmation, setShowAcceptedConfirmation] = useState(false);
  const [networkingIntent, setNetworkingIntent] = useState(event.myNetworkingIntent ?? "");
  const [networkingIntentLoading, setNetworkingIntentLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [waitlistedMessage, setWaitlistedMessage] = useState<string | null>(null);
  const [connections, setConnections] = useState<{ metUserId: string; name: string; image?: string | null; notes?: string }[]>([]);
  const [editingNotesFor, setEditingNotesFor] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  /** Trip module only for non–invite-only events (private events don't use trip planning) */
  const isTripEvent =
    (event.type === "trip" || event.category === "luxury-trips") && event.visibility !== "invite-only";
  const canViewTripEmbed = isTripEvent && (isHost || status === "going" || status === "accepted" || status === "invited");
  const [tripData, setTripData] = useState<{
    destinationOptions: { name: string; votes: number }[];
    myVotedIndices: number[];
    decidedDestination: string | null;
    votingClosed: boolean;
    votingDeadline: string | null;
    activities: { name: string; date?: string }[];
    activitiesPublishedAt: string | null;
    isHost: boolean;
  } | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripVoting, setTripVoting] = useState(false);
  const [tripCountdown, setTripCountdown] = useState<{ days: number; hours: number } | null>(null);
  const isAccepted = status === "going" || status === "accepted";
  const isInviteOnly = event.visibility === "invite-only";
  const isNetwork = event.visibility === "network";
  const canRequestInvite = isInviteOnly && event.allowGuestRequest;
  const isInvited = status === "invited";
  const isRequestPending = status === "request-invite";
  const isWaitlisted = status === "waitlisted";
  const eventEndTime = event.endAt ? new Date(event.endAt).getTime() : new Date(event.startAt).getTime();
  const isPastEvent = Date.now() > eventEndTime;

  const didAttend = status === "going" || status === "accepted";

  /** Prefetch event channel in background so "Open chat" is instant */
  useEffect(() => {
    if (prefetchedChannelId) return;
    const timer = setTimeout(() => {
      fetch(`/api/events/${event._id}/ensure-channel`, { method: "POST", credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data?.channelId) setPrefetchedChannelId(data.channelId);
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [event._id, prefetchedChannelId]);

  useEffect(() => {
    if (!isPastEvent || !didAttend) return;
    fetch(`/api/events/${event._id}/connections`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setConnections(data.connections || []))
      .catch(() => {});
  }, [event._id, isPastEvent, didAttend]);

  useEffect(() => {
    if (!canViewTripEmbed) return;
    setTripLoading(true);
    fetch(`/api/events/${event._id}/trip`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setTripData({
          destinationOptions: data.destinationOptions || [],
          myVotedIndices: data.myVotedIndices || [],
          decidedDestination: data.decidedDestination ?? null,
          votingClosed: data.votingClosed ?? false,
          votingDeadline: data.votingDeadline ?? null,
          activities: data.activities || [],
          activitiesPublishedAt: data.activitiesPublishedAt ?? null,
          isHost: data.isHost ?? isHost,
        });
      })
      .finally(() => setTripLoading(false));
  }, [event._id, canViewTripEmbed, isHost]);

  useEffect(() => {
    if (!tripData?.votingDeadline || tripData.votingClosed || tripData.decidedDestination) {
      setTripCountdown(null);
      return;
    }
    const tick = () => {
      const end = new Date(tripData.votingDeadline!).getTime();
      const now = Date.now();
      if (now >= end) {
        setTripCountdown(null);
        return;
      }
      const d = Math.floor((end - now) / (24 * 60 * 60 * 1000));
      const h = Math.floor(((end - now) % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      setTripCountdown({ days: d, hours: h });
    };
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, [tripData?.votingDeadline, tripData?.votingClosed, tripData?.decidedDestination]);

  async function handleTripVote(destinationIndex: number) {
    if (tripVoting || !tripData || tripData.votingClosed || tripData.decidedDestination) return;
    setTripVoting(true);
    try {
      const res = await fetch(`/api/events/${event._id}/trip`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", destinationIndex }),
      });
      const data = await res.json();
      if (res.ok && data.destinationOptions) {
        setTripData((prev) =>
          prev
            ? {
                ...prev,
                destinationOptions: data.destinationOptions,
                myVotedIndices: data.myVotedIndices ?? prev.myVotedIndices,
              }
            : null
        );
      }
    } finally {
      setTripVoting(false);
    }
  }

  async function handleRsvp(newStatus: string) {
    if (loading) return;
    hapticTrigger("medium");
    setLoading(true);
    setRsvpError(null);
    setWaitlistedMessage(null);
    try {
      const body: { status: string; requestNote?: string; networkingIntent?: string } = { status: newStatus };
      if ((newStatus === "request-invite" || newStatus === "waitlisted") && requestNote.trim()) {
        body.requestNote = requestNote.trim().slice(0, 500);
      }
      if (networkingIntent && (newStatus === "request-invite" || newStatus === "going" || newStatus === "accepted")) {
        body.networkingIntent = networkingIntent;
      }
      const res = await fetch(`/api/events/${event._id}/rsvp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.status);
        setGoingCount(data.goingCount ?? goingCount);
        if (data.waitlisted && data.message) setWaitlistedMessage(data.message);
        if (data.status === "accepted" || data.status === "going") {
          hapticTrigger("success");
          setShowAcceptedConfirmation(true);
          setTimeout(() => setShowAcceptedConfirmation(false), 2500);
        }
      } else {
        if (res.status === 429 && data.code === "REQUEST_LIMIT") {
          setRsvpError(data.error || "Max requests per week reached.");
        } else {
          setRsvpError(data.error || "Something went wrong.");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleNetworkingIntent(intent: string) {
    const currentStatus = status === "going" || status === "accepted" ? status : null;
    if (!currentStatus) return;
    setNetworkingIntent(intent);
    setNetworkingIntentLoading(true);
    try {
      const res = await fetch(`/api/events/${event._id}/rsvp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: currentStatus, networkingIntent: intent }),
      });
      if (!res.ok) setNetworkingIntent(networkingIntent);
    } catch {
      setNetworkingIntent(networkingIntent);
    } finally {
      setNetworkingIntentLoading(false);
    }
  }

  async function openChat() {
    if (channelLoading) return;
    hapticTrigger("light");
    if (prefetchedChannelId) {
      router.push(`/app/channel/${prefetchedChannelId}?type=${prefetchedChannelType}`);
      return;
    }
    setChannelLoading(true);
    setChannelError(null);
    try {
      const res = await fetch(`/api/events/${event._id}/ensure-channel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.channelId) {
        setPrefetchedChannelId(data.channelId);
        const t = data.channelType ?? "messaging";
        setPrefetchedChannelType(t);
        router.push(`/app/channel/${data.channelId}?type=${t}`);
      } else {
        setChannelError(data?.error || "Could not open event chat. Try again.");
      }
    } catch {
      setChannelError("Could not open event chat. Try again.");
    } finally {
      setChannelLoading(false);
    }
  }

  return (
    <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <Link
          href="/app/events"
          className="p-2 -ml-2 rounded-lg text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] transition-colors duration-[var(--elite-transition)]"
          aria-label="Back to events"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)] flex-1 truncate">
          Event
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto transition-opacity duration-[var(--elite-transition)]">
        {(event.status === "cancelled" || event.status === "postponed") && (
          <div
            className="mx-4 mt-4 rounded-[var(--elite-radius)] px-4 py-3 text-center font-medium text-white"
            style={{
              backgroundColor: event.status === "cancelled" ? "var(--elite-error, #ed4956)" : "var(--elite-text-muted)",
            }}
            role="alert"
            aria-live="polite"
          >
            {event.status === "cancelled" ? "This event has been cancelled." : "This event has been postponed."}
          </div>
        )}
        <div className="relative aspect-[2/1] w-full bg-[var(--elite-surface)]">
          {event.coverImage ? (
            <Image
              src={event.coverImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-400 via-neutral-500 to-neutral-600 relative">
              {/* Minimal Islamic geometric pattern overlay — same as event post card */}
              <div
                className="absolute inset-0 opacity-[0.12]"
                aria-hidden
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 L20 0 L40 20 L20 40 Z' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M20 0 L20 40 M0 20 L40 20' fill='none' stroke='white' stroke-width='0.3'/%3E%3C/svg%3E")`,
                }}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" aria-hidden />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {isPastEvent && (
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-neutral-700 to-neutral-900 text-white/95 border border-white/10 shadow-sm">
                  Past event
                </span>
              )}
              {isInviteOnly && (
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-neutral-700 to-neutral-900 text-white/95 border border-white/10 shadow-sm">
                  Invite only
                </span>
              )}
              {event.audienceType && (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white">
                  {event.audienceType === "men-only" ? "Men only" : event.audienceType === "members-only" ? "Members only" : event.audienceType === "business" ? "Business" : event.audienceType === "family" ? "Family" : "Open"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 className="elite-heading text-xl md:text-2xl font-semibold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {event.title}
              </h2>
              {event.eventFormat === "online" ? (
                event.meetingLink && (
                  <>
                    <span className="text-white/70 text-sm" aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-white/90">
                      <MeetingPlatformIcon platformId={event.meetingPlatform} className="w-4 h-4 shrink-0" />
                      <span className="font-medium">
                        {getMeetingPlatform(event.meetingPlatform)?.label ?? "Online"}
                      </span>
                      <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                        Join link
                      </a>
                    </span>
                  </>
                )
              ) : (
                (event.venue || event.location) && (
                  <>
                    <span className="text-white/70 text-sm" aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1 text-sm text-white/90">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {[event.venue, event.location].filter(Boolean).join(" · ")}
                    </span>
                  </>
                )
              )}
            </div>
            <p className="text-sm text-white/90 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {new Date(event.startAt).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {event.endAt && (
                  <>
                    {" – "}
                    {new Date(event.endAt).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </span>
            </p>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-5 md:grid md:grid-cols-2 md:gap-6 md:items-start transition-opacity duration-[var(--elite-transition)]" style={{ paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))" }}>
          <div className="space-y-5">
            <Link href={`/app/members/${event.hostId}`} className="group block focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] rounded-[var(--elite-radius-lg)]" aria-label={`View ${event.hostName}'s profile`}>
              <EliteCard className="elite-card-in transition-all duration-[var(--elite-transition)] hover:border-[var(--elite-accent-muted)] cursor-pointer">
                <div className="flex items-center gap-3">
                  <EliteAvatar
                    name={event.hostName}
                    image={event.hostImage}
                    size="lg"
                    gradientFallback
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--elite-text-secondary)]">
                      Organized by
                    </p>
                    <p className="elite-heading font-semibold text-[var(--elite-text)] group-hover:text-[var(--elite-accent)]">
                      {event.hostName}
                    </p>
                    {event.hostEventsCount != null && event.hostEventsCount > 0 && (
                      <p className="text-xs text-[var(--elite-text-muted)] mt-0.5">
                        Organized {event.hostEventsCount} event{event.hostEventsCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </EliteCard>
            </Link>

            {!isHost && !isPastEvent && (
              <div className="elite-card-in space-y-3">
                {showAcceptedConfirmation && (
                  <div className="flex items-center gap-2 rounded-[var(--elite-radius)] bg-[var(--elite-accent)]/10 border border-[var(--elite-accent)] px-3 py-2 text-sm font-medium text-[var(--elite-accent)]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--elite-accent)] text-[var(--elite-on-accent)]" aria-hidden>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </span>
                    You&apos;re in!
                  </div>
                )}
                {waitlistedMessage && (
                  <div className="rounded-[var(--elite-radius)] bg-[var(--elite-border-light)] border border-[var(--elite-border)] px-3 py-2 text-sm text-[var(--elite-text-secondary)]">
                    {waitlistedMessage}
                  </div>
                )}
                {rsvpError && (
                  <p className="text-sm text-[var(--elite-error)]" role="alert">{rsvpError}</p>
                )}
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  RSVP
                </h3>

                {/* Network: [Going] [Decline] */}
                {isNetwork && (
                  <div className="flex flex-wrap gap-2">
                    {isAccepted ? (
                      <p className="text-sm text-[var(--elite-text-secondary)] flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[var(--elite-accent)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        You&apos;re going.
                      </p>
                    ) : (
                      <EliteButton
                        variant="primary"
                        onClick={() => handleRsvp("going")}
                        disabled={loading}
                        loading={loading}
                        className="inline-flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Going
                      </EliteButton>
                    )}
                    <EliteButton
                      variant={status === "declined" ? "primary" : "ghost"}
                      onClick={() => handleRsvp("declined")}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      Decline
                    </EliteButton>
                  </div>
                )}

                {/* Invite-only + allowGuestRequest: invited → Accept/Decline; accepted → You're in + Opt out; request-invite → pending; none → Request Invite + form */}
                {canRequestInvite && (
                  <>
                    {isAccepted && (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-[var(--elite-text-secondary)] flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-[var(--elite-accent)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          You&apos;re attending.
                        </p>
                        <EliteButton
                          variant="ghost"
                          onClick={() => handleRsvp("declined")}
                          disabled={loading}
                          loading={loading}
                          className="inline-flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Opt out
                        </EliteButton>
                      </div>
                    )}
                    {isInvited && !isAccepted && (
                      <div className="flex flex-wrap gap-2">
                        <EliteButton
                          variant="primary"
                          onClick={() => handleRsvp("accepted")}
                          disabled={loading}
                          loading={loading}
                          className="inline-flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Accept
                        </EliteButton>
                        <EliteButton variant="ghost" onClick={() => handleRsvp("declined")} disabled={loading} className="inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Decline
                        </EliteButton>
                      </div>
                    )}
                    {(isRequestPending || isWaitlisted) && (
                      <p className="text-sm text-[var(--elite-text-secondary)]">
                        {isWaitlisted ? "You have been added to the waitlist." : "Your request is pending."}
                      </p>
                    )}
                    {!isAccepted && !isInvited && !isRequestPending && !isWaitlisted && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <EliteButton
                            variant="primary"
                            onClick={() => handleRsvp("request-invite")}
                            disabled={loading}
                            loading={loading}
                          >
                            Request invite
                          </EliteButton>
                          <EliteButton variant="ghost" onClick={() => handleRsvp("declined")} disabled={loading}>
                            Decline
                          </EliteButton>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--elite-text-secondary)] mb-1.5">Message to organizer (optional)</label>
                          <textarea
                            className="elite-events w-full min-h-[72px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-2 text-sm text-[var(--elite-text)] placeholder-[var(--elite-text-muted)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--elite-accent)]"
                            placeholder="Introduce yourself or say why you'd like to attend..."
                            value={requestNote}
                            onChange={(e) => setRequestNote(e.target.value)}
                            maxLength={500}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--elite-text-secondary)] mb-1.5">Networking interest (optional)</label>
                          <div className="flex flex-wrap gap-2">
                            {NETWORKING_OPTIONS.map((opt) => (
                              <EliteChip
                                key={opt.value}
                                selected={networkingIntent === opt.value}
                                onClick={() => setNetworkingIntent(opt.value)}
                              >
                                {opt.label}
                              </EliteChip>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Invite-only, no allowGuestRequest: accepted → You're in + Opt out; invited → Accept/Decline; not invited → private message + optional Request Invitation */}
                {isInviteOnly && !event.allowGuestRequest && (
                  <>
                    {isAccepted && (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-[var(--elite-text-secondary)] flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-[var(--elite-accent)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          You&apos;re attending.
                        </p>
                        <EliteButton
                          variant="ghost"
                          onClick={() => handleRsvp("declined")}
                          disabled={loading}
                          loading={loading}
                          className="inline-flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Opt out
                        </EliteButton>
                      </div>
                    )}
                    {isInvited && !isAccepted ? (
                      <div className="flex flex-wrap gap-2">
                        <EliteButton
                          variant="primary"
                          onClick={() => handleRsvp("accepted")}
                          disabled={loading}
                          loading={loading}
                        >
                          Accept
                        </EliteButton>
                        <EliteButton variant="ghost" onClick={() => handleRsvp("declined")} disabled={loading}>
                          Decline
                        </EliteButton>
                      </div>
                    ) : !isAccepted && (
                      <>
                        <p className="text-sm text-[var(--elite-text-secondary)]">This is a private gathering.</p>
                        {!(isRequestPending || isWaitlisted) && (
                          <EliteButton
                            variant="secondary"
                            onClick={() => handleRsvp("request-invite")}
                            disabled={loading}
                            loading={loading}
                          >
                            Request invitation
                          </EliteButton>
                        )}
                        {(isRequestPending || isWaitlisted) && (
                          <p className="text-sm text-[var(--elite-text-muted)]">
                            {isWaitlisted ? "You have been added to the waitlist." : "Your request has been sent."}
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-3">
              {channelError && (
                <p className="text-sm text-[var(--elite-error)]">{channelError}</p>
              )}

              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1" role="group" aria-label="Event actions" style={{ WebkitOverflowScrolling: "touch" }}>
                <button
                  type="button"
                  onClick={openChat}
                  disabled={channelLoading}
                  className={`${ACTION_TILE_CLASS} disabled:opacity-50`}
                  aria-label="Open event chat"
                >
                  {channelLoading ? (
                    <span className="h-6 w-6 rounded-full border-2 border-[var(--elite-accent)] border-t-transparent animate-spin" />
                  ) : (
                    <svg className="w-6 h-6 text-[var(--elite-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  )}
                  <span className="text-[10px] font-medium text-[var(--elite-text-secondary)]">Chat</span>
                </button>

                {isAccepted && (
                  <>
                    <Link
                      href={`/app/events/${event._id}/pass`}
                      onClick={() => hapticTrigger("light")}
                      className={ACTION_TILE_CLASS}
                      aria-label="View event pass"
                    >
                      <svg className="w-6 h-6 text-[var(--elite-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <span className="text-[10px] font-medium text-[var(--elite-text-secondary)]">Pass</span>
                    </Link>
                    <Link
                      href={`/app/events/${event._id}/seating`}
                      onClick={() => hapticTrigger("light")}
                      className={ACTION_TILE_CLASS}
                      aria-label="View seating"
                    >
                      <svg className="w-6 h-6 text-[var(--elite-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-[10px] font-medium text-[var(--elite-text-secondary)]">Seating</span>
                    </Link>
                  </>
                )}

                {isHost && (
                  <>
                    {isTripEvent && (
                      <Link
                        href={`/app/events/${event._id}/trip`}
                        onClick={() => hapticTrigger("light")}
                        className={ACTION_TILE_CLASS}
                        aria-label="Trip planner"
                      >
                        <svg className="w-6 h-6 text-[var(--elite-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <span className="text-[10px] font-medium text-[var(--elite-text-secondary)]">Trip</span>
                      </Link>
                    )}
                    <Link
                      href={`/app/events/${event._id}/host`}
                    onClick={() => hapticTrigger("light")}
                    className={ACTION_TILE_CLASS}
                    aria-label="Manage event"
                  >
                    <svg className="w-6 h-6 text-[var(--elite-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] font-medium text-[var(--elite-text-secondary)]">Manage</span>
                  </Link>
                    <Link
                      href={`/app/events/${event._id}/edit`}
                      onClick={() => hapticTrigger("light")}
                      className={ACTION_TILE_CLASS}
                      aria-label="Edit event"
                    >
                      <svg className="w-6 h-6 text-[var(--elite-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="text-[10px] font-medium text-[var(--elite-text-secondary)]">Edit</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {event.eventFormat === "online" && event.meetingLink && (
              <EliteCard className="elite-card-in">
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1.5 flex items-center gap-2">
                  <MeetingPlatformIcon platformId={event.meetingPlatform} className="w-4 h-4 text-[var(--elite-text-muted)]" />
                  {getMeetingPlatform(event.meetingPlatform)?.label ?? "Online event"}
                </h3>
                <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--elite-accent)] hover:underline break-all">
                  {event.meetingLink}
                </a>
                {event.meetingDetails && (
                  <p className="text-sm text-[var(--elite-card-text)] whitespace-pre-wrap mt-2">{event.meetingDetails}</p>
                )}
              </EliteCard>
            )}

            {event.dressCode && (
              <EliteCard className="elite-card-in">
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1.5 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                  Dress code & etiquette
                </h3>
                <p className="text-sm text-[var(--elite-card-text)] whitespace-pre-wrap">{event.dressCode}</p>
                {event.etiquette && (
                  <p className="text-sm text-[var(--elite-card-text)] whitespace-pre-wrap mt-2">{event.etiquette}</p>
                )}
              </EliteCard>
            )}

            {event.prayerFacilityInfo && (
              <EliteCard className="elite-card-in">
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1.5">Prayer facility</h3>
                <p className="text-sm text-[var(--elite-card-text)] whitespace-pre-wrap">{event.prayerFacilityInfo}</p>
              </EliteCard>
            )}

            {canViewTripEmbed && (
              <>
                <EliteCard className="elite-card-in">
                  <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1.5">Trip destination</h3>
                  {tripLoading ? (
                    <p className="text-sm text-[var(--elite-text-muted)]">Loading…</p>
                  ) : tripData ? (
                    <>
                      {tripData.decidedDestination ? (
                        <p className="text-sm text-[var(--elite-text)] font-medium">
                          Decided: {tripData.decidedDestination}
                        </p>
                      ) : tripData.votingClosed ? (
                        <p className="text-sm text-[var(--elite-text-muted)]">Voting has closed. The organizer will finalize the destination.</p>
                      ) : (
                        <>
                          {tripCountdown != null && (
                            <p className="text-xs text-[var(--elite-text-muted)] mb-2">
                              Voting closes in {tripCountdown.days}d {tripCountdown.hours}h
                            </p>
                          )}
                          {tripData.destinationOptions.length === 0 ? (
                            <p className="text-sm text-[var(--elite-text-muted)]">No options yet. Host will add destinations in the trip plan.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {tripData.destinationOptions.map((opt, i) => {
                                const voted = tripData.myVotedIndices.includes(i);
                                return (
                                  <li key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--elite-border)] last:border-0">
                                    <span className="text-sm text-[var(--elite-text)]">{opt.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-[var(--elite-text-muted)]">{opt.votes} vote{opt.votes !== 1 ? "s" : ""}</span>
                                      {!tripData.isHost && (
                                        <button
                                          type="button"
                                          onClick={() => handleTripVote(i)}
                                          disabled={tripVoting}
                                          className="elite-events p-1.5 rounded-md border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] disabled:opacity-50"
                                          aria-label={voted ? "Remove vote" : "Vote"}
                                        >
                                          {voted ? (
                                            <svg className="w-4 h-4 text-[var(--elite-accent)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                          ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {tripData.isHost && (
                            <p className="text-xs text-[var(--elite-text-muted)] mt-2">
                              Add options, finalize, and manage the trip from the{" "}
                              <Link href={`/app/events/${event._id}/trip`} className="text-[var(--elite-accent)] hover:underline">Trip plan</Link> page.
                            </p>
                          )}
                        </>
                      )}
                    </>
                  ) : null}
                </EliteCard>
                {tripData?.activitiesPublishedAt && tripData.activities.length > 0 && (
                  <EliteCard className="elite-card-in">
                    <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1.5 flex items-center gap-2">
                      <svg className="w-4 h-4 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                      Trip activities
                    </h3>
                    <p className="text-xs text-[var(--elite-text-muted)] mb-2">Published by organizer · read-only</p>
                    <ul className="space-y-1.5">
                      {tripData.activities.map((a, i) => (
                        <li key={i} className="text-sm text-[var(--elite-card-text)] py-1">
                          {a.date ? `${a.date} — ` : ""}{a.name}
                        </li>
                      ))}
                    </ul>
                  </EliteCard>
                )}
              </>
            )}

            {event.description && (
              <EliteCard className="elite-card-in">
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1.5">About</h3>
                <p className="text-sm text-[var(--elite-card-text)] whitespace-pre-wrap">{event.description}</p>
              </EliteCard>
            )}

            {!isPastEvent && (status === "going" || status === "accepted") && (
              <div className="elite-card-in">
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2">Networking intent</h3>
                <p className="text-xs text-[var(--elite-text-muted)] mb-2">Set your interest so we can suggest who to connect with.</p>
                <div className="flex flex-wrap gap-2">
                  {NETWORKING_OPTIONS.map(({ value, label }) => (
                    <EliteChip
                      key={value}
                      selected={networkingIntent === value}
                      onClick={() => handleNetworkingIntent(value)}
                      disabled={networkingIntentLoading}
                    >
                      {label}
                    </EliteChip>
                  ))}
                </div>
              </div>
            )}

            <div className="elite-card-in">
              <p className="text-sm font-medium text-[var(--elite-text)] mb-2">
                {goingCount} attending {event.capacity ? `· ${event.capacity} capacity` : ""}
              </p>
              {event.capacity != null && event.capacity > 0 && (
                <div className="mb-3">
                  <div className="h-2 w-full rounded-full bg-[var(--elite-border-light)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--elite-accent)] transition-all duration-[var(--elite-transition)]"
                      style={{ width: `${Math.min(100, (goingCount / event.capacity) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--elite-text-muted)] mt-1">
                    {goingCount >= event.capacity ? "At capacity" : `${event.capacity - goingCount} spots left`}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {event.attendees.map((a) => (
                  <EliteAvatar
                    key={a.userId}
                    name={a.name}
                    image={a.image}
                    href={`/app/members/${a.userId}`}
                    size="sm"
                    vip={a.vipTag}
                    gradientFallback
                  />
                ))}
              </div>
            </div>

            {!isPastEvent && event.attendees.filter((a) => a.userId !== currentUserId).length > 0 && (
              <EliteCard className="elite-card-in">
                <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2">
                  People you might want to meet
                </h3>
                <p className="text-xs text-[var(--elite-text-muted)] mb-3">
                  {(status === "going" || status === "accepted")
                    ? networkingIntent
                      ? "Attendees with similar or complementary interests"
                      : "Set your networking intent above to see personalized suggestions."
                    : "Other attendees at this event. Join the event to set your networking interest and get suggestions."}
                </p>
                <ul className="space-y-2">
                  {(() => {
                    const others = event.attendees.filter((a) => a.userId !== currentUserId);
                    const isAttending = status === "going" || status === "accepted";
                    const suggested = isAttending && networkingIntent
                      ? [...others.filter((a) => a.networkingIntent === networkingIntent), ...others.filter((a) => a.networkingIntent && a.networkingIntent !== networkingIntent)].slice(0, 5)
                      : isAttending
                        ? [...others.filter((a) => a.networkingIntent), ...others.filter((a) => !a.networkingIntent)].slice(0, 5)
                        : others.slice(0, 5);
                    const toShow = suggested.length > 0 ? suggested : others.slice(0, 5);
                    return toShow;
                  })().map((a) => (
                      <li key={a.userId} className="flex items-center gap-3">
                        <EliteAvatar name={a.name} image={a.image} href={`/app/members/${a.userId}`} size="sm" vip={a.vipTag} gradientFallback />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--elite-text)] truncate">{a.name}</p>
                          {a.networkingIntent && (
                            <p className="text-xs text-[var(--elite-text-muted)] capitalize">{a.networkingIntent}</p>
                          )}
                        </div>
                        <Link
                          href={`/app/members/${a.userId}`}
                          className="text-xs font-medium text-[var(--elite-accent)] hover:underline shrink-0"
                        >
                          View profile
                        </Link>
                      </li>
                    ))}
                </ul>
              </EliteCard>
            )}

            {isPastEvent && (
              <>
                <EliteCard className="elite-card-in">
                  <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-1">Event recap</h3>
                  <p className="text-sm text-[var(--elite-text-secondary)]">
                    {goingCount} attended this event.
                    {event.attendees.some((a) => a.networkingIntent) && (() => {
                      const intents = event.attendees.map((a) => a.networkingIntent).filter(Boolean) as string[];
                      const counts: Record<string, number> = {};
                      intents.forEach((i) => { counts[i] = (counts[i] || 0) + 1; });
                      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                      return top ? ` ${top[1]} had ${top[0]} as networking intent.` : "";
                    })()}
                  </p>
                </EliteCard>
                {event.attendees.filter((a) => a.userId !== currentUserId).length > 0 && (
                  <EliteCard className="elite-card-in">
                    <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2">Who attended</h3>
                    <p className="text-xs text-[var(--elite-text-muted)] mb-3">People who attended this event.</p>
                    <ul className="space-y-2">
                      {event.attendees
                        .filter((a) => a.userId !== currentUserId)
                        .slice(0, 5)
                        .map((a) => (
                          <li key={a.userId} className="flex items-center gap-3">
                            <EliteAvatar name={a.name} image={a.image} href={`/app/members/${a.userId}`} size="sm" vip={a.vipTag} gradientFallback />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[var(--elite-text)] truncate">{a.name}</p>
                              {a.networkingIntent && (
                                <p className="text-xs text-[var(--elite-text-muted)] capitalize">{a.networkingIntent}</p>
                              )}
                            </div>
                            <Link
                              href={`/app/members/${a.userId}`}
                              className="text-xs font-medium text-[var(--elite-accent)] hover:underline shrink-0"
                            >
                              View profile
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </EliteCard>
                )}
                {didAttend && (
                <EliteCard className="elite-card-in">
                  <h3 className="elite-heading text-sm font-semibold text-[var(--elite-text)] mb-2">
                    People you met
                  </h3>
                  {connections.length === 0 ? (
                    <p className="text-sm text-[var(--elite-text-muted)] mb-3">
                      Add people you met at this event to stay in touch.
                    </p>
                  ) : null}
                  {event.attendees.filter((a) => a.userId !== currentUserId && !connections.some((c) => c.metUserId === a.userId)).length > 0 && (
                    <p className="text-xs text-[var(--elite-text-muted)] mb-2">Add someone you met (from attendees):</p>
                  )}
                  {event.attendees
                    .filter((a) => a.userId !== currentUserId && !connections.some((c) => c.metUserId === a.userId))
                    .slice(0, 5)
                    .map((a) => (
                      <div key={a.userId} className="flex items-center gap-2 mb-2">
                        <EliteAvatar name={a.name} image={a.image} href={`/app/members/${a.userId}`} size="sm" gradientFallback />
                        <span className="text-sm text-[var(--elite-card-text)] flex-1">{a.name}</span>
                        <EliteButton
                          variant="secondary"
                          onClick={async () => {
                            await fetch(`/api/events/${event._id}/connections`, {
                              method: "POST",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ metUserId: a.userId, notes: "" }),
                            });
                            setConnections((prev) => [...prev, { metUserId: a.userId, name: a.name, image: a.image }]);
                          }}
                        >
                          Add
                        </EliteButton>
                      </div>
                    ))}
                  {connections.length > 0 ? (
                    <ul className="space-y-3">
                      {connections.map((c) => (
                        <li key={c.metUserId} className="rounded-lg border border-[var(--elite-border)] p-2">
                          <div className="flex items-center gap-2">
                            <EliteAvatar name={c.name} image={c.image} href={`/app/members/${c.metUserId}`} size="sm" gradientFallback />
                            <span className="text-sm font-medium text-[var(--elite-card-text)] flex-1">{c.name}</span>
                            <Link href="/app/chats" className="text-xs text-[var(--elite-accent)] hover:underline">
                              Message
                            </Link>
                            <Link href={`/app/members/${c.metUserId}`} className="text-xs text-[var(--elite-text-muted)] hover:underline">
                              Profile
                            </Link>
                          </div>
                          {editingNotesFor === c.metUserId ? (
                            <div className="mt-2">
                              <textarea
                                className="elite-events w-full min-h-[60px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-1.5 text-xs text-[var(--elite-text)]"
                                placeholder="e.g. Met at dinner, discussed fintech"
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                              />
                              <div className="flex gap-2 mt-1">
                                <EliteButton
                                  variant="primary"
                                  onClick={async () => {
                                    await fetch(`/api/events/${event._id}/connections`, {
                                      method: "POST",
                                      credentials: "include",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ metUserId: c.metUserId, notes: notesDraft }),
                                    });
                                    setConnections((prev) => prev.map((x) => (x.metUserId === c.metUserId ? { ...x, notes: notesDraft } : x)));
                                    setEditingNotesFor(null);
                                  }}
                                >
                                  Save
                                </EliteButton>
                                <EliteButton variant="ghost" onClick={() => { setEditingNotesFor(null); setNotesDraft(""); }}>
                                  Cancel
                                </EliteButton>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1.5">
                              {c.notes ? (
                                <p className="text-xs text-[var(--elite-text-secondary)]">{c.notes}</p>
                              ) : null}
                              <button
                                type="button"
                                className="text-xs text-[var(--elite-accent)] hover:underline mt-0.5"
                                onClick={() => { setEditingNotesFor(c.metUserId); setNotesDraft(c.notes ?? ""); }}
                              >
                                {c.notes ? "Edit note" : "Add note"}
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-xs text-[var(--elite-text-muted)] mt-2">
                    Use the event chat above to connect with attendees.
                  </p>
                </EliteCard>
                )}
              </>
            )}

            <div className="pt-2">
              <ReportButton targetType="event" targetId={event._id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
