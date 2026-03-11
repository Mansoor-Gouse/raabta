"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EliteAvatar } from "@/components/elite";

export type EliteEventCardAttendee = {
  userId: string;
  name: string;
  image?: string | null;
  headline?: string;
  location?: string;
};

export type EliteEventCardEvent = {
  _id: string;
  title: string;
  type: string;
  category?: string;
  startAt: string | Date;
  endAt?: string | Date;
  location?: string;
  venue?: string;
  eventFormat?: "online" | "offline";
  meetingLink?: string;
  coverImage?: string;
  hostId?: string;
  hostName: string;
  hostImage?: string | null;
  goingCount: number;
  capacity?: number;
  visibility?: string;
  status?: string;
  featured?: boolean;
  attendeePreview?: EliteEventCardAttendee[];
  fromYourCity?: number;
  fromYourNetwork?: number;
  myStatus?: "going" | "accepted" | "invited" | "request-invite" | "declined" | null;
};

type EliteEventCardProps = {
  event: EliteEventCardEvent;
  /** Optional extra badge (VIP / Elite). "Invite only" is shown automatically when event.visibility === "invite-only". */
  badge?: "vip" | "elite" | null;
  currentUserId?: string | null;
  variant?: "default" | "spotlight";
  /** When "carousel", card has fixed width for horizontal scroll; otherwise flexible for grid */
  sizing?: "carousel" | "auto";
};

const CATEGORY_LABELS: Record<string, string> = {
  business: "Business",
  philanthropy: "Philanthropy",
  family: "Family",
  religious: "Religious",
  "luxury-trips": "Curated Trips",
  education: "Education",
  event: "Event",
  trip: "Trip",
  retreat: "Retreat",
  umrah: "Umrah",
  hajj: "Hajj",
};

function AttendeeAvatarWithTooltip({ attendee }: { attendee: EliteEventCardAttendee }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipContent = [attendee.name, attendee.headline, attendee.location].filter(Boolean).join(" · ");
  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <span
        className="inline-block ring-2 ring-neutral-600 rounded-full"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowTooltip((v) => !v);
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowTooltip((v) => !v);
        }}
        aria-label={tooltipContent || attendee.name}
      >
        <EliteAvatar
          name={attendee.name}
          image={attendee.image}
          size="sm"
          gradientFallback
          className="ring-2 ring-neutral-600"
        />
      </span>
      {showTooltip && (
        <div
          className="elite-events absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[var(--elite-card)] border border-[var(--elite-border)] shadow-[var(--elite-shadow-lg)] text-left min-w-[140px] max-w-[200px]"
          role="tooltip"
        >
          <p className="text-sm font-medium text-[var(--elite-text)] truncate">{attendee.name}</p>
          {attendee.headline && <p className="text-xs text-[var(--elite-text-muted)] truncate">{attendee.headline}</p>}
          {attendee.location && <p className="text-xs text-[var(--elite-text-muted)] truncate">{attendee.location}</p>}
        </div>
      )}
    </div>
  );
}

function parseEventDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function EliteEventCard({ event, badge = null, currentUserId = null, variant = "default", sizing = "auto" }: EliteEventCardProps) {
  const categoryLabel =
    (event.category && CATEGORY_LABELS[event.category]) ||
    CATEGORY_LABELS[event.type] ||
    event.type;
  const startDate = parseEventDate(event.startAt);
  const eventEndTime = event.endAt ? parseEventDate(event.endAt).getTime() : startDate.getTime();
  const isPast = eventEndTime < Date.now();
  const displayDate = event.endAt ? parseEventDate(event.endAt) : startDate;
  const isHost = currentUserId != null && String(event.hostId) === String(currentUserId);
  /** Only show "You" as organizer when user is the host; never for invitees (invited events show actual host) */
  const isOrganizerDisplay = isHost && event.myStatus !== "invited";

  const carouselSizing = sizing === "carousel" ? (variant === "spotlight" ? "min-w-[300px] w-[300px]" : "min-w-[280px] w-[280px]") : "";
  const cardClassName =
    variant === "spotlight"
      ? `elite-events block rounded-[var(--elite-radius-lg)] overflow-hidden border-2 border-[var(--elite-spotlight-accent)] bg-[var(--elite-card)] hover:border-[var(--elite-spotlight-accent)] hover:shadow-[var(--elite-spotlight-glow)] shadow-[var(--elite-spotlight-glow)] transition-all duration-[var(--elite-transition)] elite-hover-lift focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] shrink-0 ${carouselSizing}`
      : `elite-events block rounded-[var(--elite-radius-lg)] overflow-hidden border border-[var(--elite-border)] bg-[var(--elite-card)] hover:border-[var(--elite-accent-muted)] hover:shadow-[var(--elite-shadow)] transition-all duration-[var(--elite-transition)] elite-hover-lift focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] shrink-0 ${carouselSizing}`;

  const ariaLabel = isPast
    ? `${event.title}, Past event, ended ${displayDate.toLocaleDateString()}`
    : `${event.title}, ${startDate.toLocaleDateString()}`;

  return (
    <Link
      href={`/app/events/${event._id}`}
      className={cardClassName}
      aria-label={ariaLabel}
    >
      <div className={`relative aspect-[3/2] w-full bg-[var(--elite-surface)] ${isPast ? "opacity-90" : ""}`}>
        {isPast && (
          <span className="absolute top-3 right-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-neutral-700 to-neutral-900 text-white/95 border border-white/10 shadow-sm">
            Past
          </span>
        )}
        {event.coverImage ? (
          <Image
            src={event.coverImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-400 via-neutral-500 to-neutral-600 relative">
            {/* Minimal Islamic geometric pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.12]"
              aria-hidden
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 L20 0 L40 20 L20 40 Z' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M20 0 L20 40 M0 20 L40 20' fill='none' stroke='white' stroke-width='0.3'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
          aria-hidden
        />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {(event.myStatus === "going" || event.myStatus === "accepted") && !isOrganizerDisplay && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-neutral-800 to-black text-white border border-white/10 shadow-sm shrink-0">
                <span aria-hidden>✓</span> {isPast ? "You attended" : "You're attending"}
              </span>
            )}
            {event.myStatus === "request-invite" && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/80 text-amber-100 border border-amber-600/30 shadow-sm shrink-0">
                Requested
              </span>
            )}
            {(event.visibility === "invite-only" || badge) && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-neutral-800 to-black text-white border border-white/10 shadow-sm shrink-0">
                {event.visibility === "invite-only" ? "Invite only" : badge === "vip" ? "VIP" : "Elite"}
              </span>
            )}
            {categoryLabel !== "Event" && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium tracking-widest uppercase bg-black/70 text-white/95 border border-white/10 backdrop-blur-sm shrink-0">
                {categoryLabel}
              </span>
            )}
          </div>
          <h3 className="elite-heading text-lg font-semibold tracking-tight text-white line-clamp-2 leading-tight">
            {event.title}
          </h3>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-[var(--elite-card-text)]">
          {isPast
            ? `Ended ${displayDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
            : startDate.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
          {event.eventFormat === "online"
            ? " · Online"
            : (event.venue || event.location)
              ? ` · ${[event.venue, event.location].filter(Boolean).join(" · ")}`
              : ""}
        </p>
        <div className="flex items-start gap-3 mt-3">
          <EliteAvatar
            name={isOrganizerDisplay ? "You" : event.hostName}
            image={event.hostImage}
            size="sm"
            gradientFallback
            className="ring-2 ring-neutral-600 shrink-0"
          />
          <div className="min-w-0 flex-1 flex flex-col gap-0">
            <span
              className="inline-flex w-fit items-center px-1 py-px rounded text-[8px] font-semibold uppercase tracking-wider bg-[var(--elite-accent)]/10 text-[var(--elite-accent)] border border-[var(--elite-accent)]/25"
              aria-label="Event organizer"
            >
              Organizer
            </span>
            <span className="text-sm text-[var(--elite-card-text)] truncate mt-0.5">
              {isOrganizerDisplay ? "You" : event.hostName}
            </span>
          </div>
          <span className="text-xs text-[var(--elite-text-muted)] shrink-0">
            {isPast
              ? isOrganizerDisplay && event.capacity != null && event.capacity > 0
                ? `${event.goingCount} / ${event.capacity} attended`
                : `${event.goingCount} attended`
                : isOrganizerDisplay && event.capacity != null && event.capacity > 0
                ? `Guests: ${event.goingCount} / ${event.capacity}`
                : `${event.goingCount} attending`}
          </span>
        </div>
        {(event.fromYourCity != null && event.fromYourCity > 0) || (event.fromYourNetwork != null && event.fromYourNetwork > 0) ? (
          <p className="text-xs text-[var(--elite-text-muted)] mt-1.5">
            {event.fromYourCity != null && event.fromYourCity > 0 && `${event.fromYourCity} from your city`}
            {event.fromYourCity != null && event.fromYourCity > 0 && event.fromYourNetwork != null && event.fromYourNetwork > 0 && " · "}
            {event.fromYourNetwork != null && event.fromYourNetwork > 0 && `${event.fromYourNetwork} in your network`}
          </p>
        ) : null}
        {event.attendeePreview && event.attendeePreview.length > 0 && (
          <div className="flex items-center gap-1 mt-2 -space-x-2 flex-wrap">
            <span className="text-xs text-[var(--elite-text-muted)] w-full mb-1">{isPast ? "Guests who attended" : "Guests attending"}</span>
            {event.attendeePreview.slice(0, 5).map((a) => (
              <AttendeeAvatarWithTooltip key={a.userId} attendee={a} />
            ))}
            {event.attendeePreview && event.goingCount > event.attendeePreview.length && (
              <span className="text-xs text-[var(--elite-text-muted)] pl-1">
                +{event.goingCount - event.attendeePreview.length} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
