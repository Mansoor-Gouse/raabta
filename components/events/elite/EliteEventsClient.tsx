"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { EliteChip, EliteSection, EliteButton } from "@/components/elite";
import { EliteEventCard, type EliteEventCardEvent } from "./EliteEventCard";
import { EliteEventCardSkeleton } from "./EliteEventsSkeleton";
import { trigger as hapticTrigger } from "@/lib/haptics";

const SECTION_KEYS = ["discover", "invited", "going", "spotlight", "my"] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

function isPastEvent(ev: EliteEventCardEvent): boolean {
  const endAt = (ev as { endAt?: string }).endAt;
  const ref = endAt || (typeof ev.startAt === "string" ? ev.startAt : ev.startAt.toISOString());
  return new Date(ref).getTime() < Date.now();
}

function splitByPast<T extends EliteEventCardEvent>(list: T[]): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const ev of list) {
    if (isPastEvent(ev)) past.push(ev);
    else upcoming.push(ev);
  }
  return { upcoming, past };
}

const ELITE_CATEGORIES = [
  { value: "", label: "All" },
  { value: "business", label: "Business" },
  { value: "philanthropy", label: "Philanthropy" },
  { value: "family", label: "Family" },
  { value: "religious", label: "Religious" },
  { value: "luxury-trips", label: "Curated Trips" },
  { value: "education", label: "Education" },
] as const;

const DATE_RANGES = [
  { value: "", label: "Any time" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "next_3_months", label: "Next 3 months" },
] as const;

const LOCATION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "Dubai", label: "Dubai" },
  { value: "London", label: "London" },
  { value: "Riyadh", label: "Riyadh" },
  { value: "Jeddah", label: "Jeddah" },
  { value: "Makkah", label: "Makkah" },
  { value: "Istanbul", label: "Istanbul" },
  { value: "Maldives", label: "Maldives" },
  { value: "Hyderabad", label: "Hyderabad" },
  { value: "Bangalore", label: "Bangalore" },
] as const;

const EVENTS_PAGE_SIZE = 12;

function PanelSkeleton() {
  return (
    <div className="elite-events transition-opacity duration-200">
      <div className="h-5 w-28 rounded bg-[var(--elite-border)] animate-pulse mb-3" />
      <ul className="flex gap-4 overflow-x-auto no-scrollbar pb-2" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i}>
            <EliteEventCardSkeleton delay={i * 80} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventCarousel({
  events,
  currentUserId,
  variant = "default",
  ariaLabel,
}: {
  events: EliteEventCardEvent[];
  currentUserId?: string | null;
  variant?: "default" | "spotlight";
  ariaLabel: string;
}) {
  if (events.length === 0) return null;
  return (
    <ul
      className="flex gap-4 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory"
      style={{ WebkitOverflowScrolling: "touch" }}
      aria-label={ariaLabel}
    >
      {events.map((ev, i) => (
        <li
          key={ev._id}
          className="elite-event-card-in shrink-0 snap-start"
          style={{ ["--card-index" as string]: i }}
        >
          <EliteEventCard
            event={ev}
            currentUserId={currentUserId}
            variant={variant}
            sizing="carousel"
          />
        </li>
      ))}
    </ul>
  );
}

function SectionWithPast({
  title,
  events,
  emptyMessage,
  currentUserId,
  variant = "default",
}: {
  title: string;
  events: EliteEventCardEvent[];
  emptyMessage: string;
  currentUserId?: string | null;
  variant?: "default" | "spotlight";
}) {
  const { upcoming, past } = splitByPast(events);
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <EliteSection title={title}>
        <p className="text-sm text-[var(--elite-text-muted)] py-8 px-1 text-center">{emptyMessage}</p>
      </EliteSection>
    );
  }
  return (
    <EliteSection title={title}>
      {upcoming.length > 0 && (
        <>
          <h3 className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Upcoming</h3>
          <EventCarousel events={upcoming} currentUserId={currentUserId} variant={variant} ariaLabel={`${title} upcoming`} />
        </>
      )}
      {past.length > 0 && (
        <div className={upcoming.length > 0 ? "mt-6" : ""}>
          <h3 className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Past</h3>
          <EventCarousel events={past} currentUserId={currentUserId} variant={variant} ariaLabel={`${title} past`} />
        </div>
      )}
    </EliteSection>
  );
}

function DiscoverSection({
  discoverEvents,
  hasMore,
  loadMoreLoading,
  loadMore,
  categoryFilter,
  currentUserId,
}: {
  discoverEvents: EliteEventCardEvent[];
  hasMore: boolean;
  loadMoreLoading: boolean;
  loadMore: () => void;
  categoryFilter: string;
  currentUserId?: string | null;
}) {
  const { upcoming, past } = splitByPast(discoverEvents);
  const hasAny = upcoming.length > 0 || past.length > 0;
  const title = categoryFilter ? "Events" : "Discover";
  return (
    <EliteSection title={title}>
      {!hasAny ? (
        <p className="text-sm text-[var(--elite-text-muted)] py-4 px-1">
          No other events to show. Adjust filters or check back later.
        </p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h3 className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Upcoming</h3>
              <EventCarousel events={upcoming} currentUserId={currentUserId} ariaLabel="Discover upcoming" />
            </>
          )}
          {past.length > 0 && (
            <div className={upcoming.length > 0 ? "mt-6" : ""}>
              <h3 className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Past</h3>
              <EventCarousel events={past} currentUserId={currentUserId} ariaLabel="Discover past" />
            </div>
          )}
          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-3 transition-opacity duration-[var(--elite-transition)]">
              {loadMoreLoading && (
                <div className="w-full max-w-sm space-y-2 animate-pulse">
                  <div className="h-24 rounded-[var(--elite-radius-lg)] bg-[var(--elite-border)]/60" />
                  <div className="h-24 rounded-[var(--elite-radius-lg)] bg-[var(--elite-border)]/60" />
                </div>
              )}
              <EliteButton
                variant="secondary"
                onClick={loadMore}
                disabled={loadMoreLoading}
                loading={loadMoreLoading}
                ariaLabel="Load more events"
                className="transition-opacity duration-[var(--elite-transition)]"
              >
                {loadMoreLoading ? "Loading…" : "Load more"}
              </EliteButton>
            </div>
          )}
        </>
      )}
    </EliteSection>
  );
}

function SpotlightSection({
  spotlightEvents,
  categoryFilter,
  currentUserId,
}: {
  spotlightEvents: EliteEventCardEvent[];
  categoryFilter: string;
  currentUserId?: string | null;
}) {
  const { upcoming, past } = splitByPast(spotlightEvents);
  const hasAny = upcoming.length > 0 || past.length > 0;
  return (
    <div className="elite-events">
      <h2 className="elite-heading text-lg md:text-xl font-semibold tracking-tight text-[var(--elite-text)] mb-4">Spotlight</h2>
      {!hasAny ? (
        <p className="text-sm text-[var(--elite-text-muted)] py-8 px-1 text-center">
          {categoryFilter ? "Clear filters to see spotlight picks." : "No spotlight events right now."}
        </p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h3 className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Upcoming</h3>
              <EventCarousel events={upcoming} currentUserId={currentUserId} variant="spotlight" ariaLabel="Spotlight upcoming" />
            </>
          )}
          {past.length > 0 && (
            <div className={upcoming.length > 0 ? "mt-6" : ""}>
              <h3 className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Past</h3>
              <EventCarousel events={past} currentUserId={currentUserId} variant="spotlight" ariaLabel="Spotlight past" />
            </div>
          )}
          <p className="text-sm text-[var(--elite-text-muted)] mt-2">Featured picks. Swipe for more.</p>
        </>
      )}
    </div>
  );
}

function MyEventsSection({ myEvents, currentUserId }: { myEvents: EliteEventCardEvent[]; currentUserId?: string | null }) {
  const { upcoming, past } = splitByPast(myEvents);
  const hasAny = upcoming.length > 0 || past.length > 0;
  return (
    <EliteSection title="My events">
      {!hasAny ? (
        <div className="py-6 px-4 rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-surface)]/50">
          <p className="text-sm text-[var(--elite-text-secondary)] text-center mb-3">
            You haven&apos;t created any events.
          </p>
          <Link
            href="/app/events/new"
            className="elite-events inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[var(--elite-radius)] text-sm font-medium bg-transparent text-[var(--elite-text)] border border-[var(--elite-border)] hover:border-[var(--elite-accent-muted)] transition-all focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create event
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h3 className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Upcoming</h3>
              <EventCarousel events={upcoming} currentUserId={currentUserId} ariaLabel="My events upcoming" />
            </>
          )}
          {past.length > 0 && (
            <div className={upcoming.length > 0 ? "mt-6" : ""}>
              <h3 className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Past</h3>
              <EventCarousel events={past} currentUserId={currentUserId} ariaLabel="My events past" />
            </div>
          )}
        </>
      )}
    </EliteSection>
  );
}

type EliteEventsClientProps = {
  currentUserId?: string | null;
  initialSection?: string;
  /** When false, hide floating actions so they do not bleed into other panels */
  isActive?: boolean;
};

const VALID_SECTIONS: SectionKey[] = ["discover", "invited", "going", "spotlight", "my"];

export function EliteEventsClient({
  currentUserId = null,
  initialSection,
  isActive = true,
}: EliteEventsClientProps) {
  const [events, setEvents] = useState<EliteEventCardEvent[]>([]);
  const [discoverOrder, setDiscoverOrder] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(
    initialSection && VALID_SECTIONS.includes(initialSection as SectionKey) ? (initialSection as SectionKey) : "discover"
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initialSectionHandled = useRef(false);
  const hasLoadedOnce = useRef(false);

  const scrollToSection = useCallback((key: SectionKey) => {
    hapticTrigger("light");
    const index = SECTION_KEYS.indexOf(key);
    if (index < 0 || !scrollContainerRef.current) return;
    const pageWidth = scrollContainerRef.current.offsetWidth;
    scrollContainerRef.current.scrollTo({ left: index * pageWidth, behavior: "smooth" });
    setActiveSection(key);
  }, []);

  function loadEvents(reset = true, skipOverride?: number) {
    if (reset) {
      setError(null);
      if (!hasLoadedOnce.current) setLoading(true);
      else setFilterLoading(true);
    }
    const skip = reset ? 0 : (skipOverride ?? events.length);
    const params = new URLSearchParams({ limit: String(EVENTS_PAGE_SIZE), skip: String(skip) });
    if (categoryFilter) params.set("category", categoryFilter);
    if (dateRange) params.set("dateRange", dateRange);
    if (locationFilter) params.set("location", locationFilter);
    const url = `/api/events?${params.toString()}`;
    fetch(url, { credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401) throw new Error("Please sign in to view events.");
          throw new Error("Could not load events. Try again.");
        }
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data.events) ? data.events : [];
        if (reset) {
          setEvents(list);
          setDiscoverOrder(Array.isArray(data.discoverOrder) ? data.discoverOrder : []);
        } else {
          setEvents((prev) => [...prev, ...list]);
        }
        setHasMore(Boolean(data.hasMore));
      })
      .catch((err) => {
        if (reset) {
          setEvents([]);
          setError(err instanceof Error ? err.message : "Could not load events.");
        }
      })
      .finally(() => {
        if (reset) {
          hasLoadedOnce.current = true;
          setLoading(false);
          setFilterLoading(false);
        } else setLoadMoreLoading(false);
      });
  }

  function loadMore() {
    if (loadMoreLoading || !hasMore) return;
    setLoadMoreLoading(true);
    loadEvents(false, events.length);
  }

  /** My events: only events the user hosts; exclude invited (invitee view must not see those in My events) */
  const myEvents = currentUserId
    ? events.filter(
        (e) =>
          String(e.hostId) === String(currentUserId) &&
          e.myStatus !== "invited"
      )
    : [];
  const invitedEvents = currentUserId
    ? events.filter(
        (e) =>
          String(e.hostId) !== String(currentUserId) &&
          e.myStatus === "invited"
      )
    : [];
  const goingTo = currentUserId
    ? events.filter(
        (e) =>
          String(e.hostId) !== String(currentUserId) &&
          (e.myStatus === "going" || e.myStatus === "accepted")
      )
    : [];
  const otherEvents = events.filter(
    (e) =>
      String(e.hostId) !== String(currentUserId) &&
      e.myStatus !== "going" &&
      e.myStatus !== "accepted" &&
      e.myStatus !== "invited"
  );
  const spotlightEvents = events.filter(
    (e) =>
      e.featured === true &&
      String(e.hostId) !== String(currentUserId) &&
      e.myStatus !== "going" &&
      e.myStatus !== "accepted" &&
      e.myStatus !== "invited"
  );
  const discoverCandidates = events.filter(
    (e) =>
      String(e.hostId) !== String(currentUserId) &&
      e.myStatus !== "going" &&
      e.myStatus !== "accepted" &&
      e.myStatus !== "invited" &&
      e.featured !== true &&
      e.visibility === "network" &&
      e.status === "active"
  );
  const discoverEvents =
    discoverOrder.length > 0
      ? [...discoverCandidates].sort((a, b) => {
          const ai = discoverOrder.indexOf(a._id);
          const bi = discoverOrder.indexOf(b._id);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        })
      : discoverCandidates;

  const hasAnySections =
    myEvents.length > 0 ||
    invitedEvents.length > 0 ||
    goingTo.length > 0 ||
    otherEvents.length > 0;

  const hasActiveFilter = !!(categoryFilter || dateRange || locationFilter);
  const showSectionTabsAndPanels = !error && (hasAnySections || hasActiveFilter);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadEvents(true);
      return;
    }
    setFilterLoading(true);
    loadEvents(true);
  }, [categoryFilter, dateRange, locationFilter]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const pageWidth = el.offsetWidth;
      const index = Math.round(el.scrollLeft / pageWidth);
      const key = SECTION_KEYS[Math.max(0, Math.min(index, SECTION_KEYS.length - 1))];
      setActiveSection(key);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [showSectionTabsAndPanels]);

  useEffect(() => {
    if (!showSectionTabsAndPanels || initialSectionHandled.current || !initialSection) return;
    const key = initialSection as SectionKey;
    if (!VALID_SECTIONS.includes(key)) return;
    initialSectionHandled.current = true;
    const el = scrollContainerRef.current;
    if (!el) return;
    const index = SECTION_KEYS.indexOf(key);
    if (index <= 0) return;
    const pageWidth = el.offsetWidth;
    el.scrollTo({ left: index * pageWidth, behavior: "auto" });
    setActiveSection(key);
  }, [showSectionTabsAndPanels, initialSection]);

  const showTabsAndContentShell = loading || showSectionTabsAndPanels;

  return (
    <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
      {/* Static header: visible instantly on nav for smooth transition */}
      <header
        className="sticky top-0 z-10 flex items-center px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <h1 className="feed-title-font text-lg font-semibold text-[var(--elite-text)]">
          The Rope
        </h1>
      </header>

      {/* Filter drawer: slide-up from bottom */}
      {filterExpanded && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity"
            style={{ paddingTop: "var(--safe-area-inset-top)" }}
            onClick={() => setFilterExpanded(false)}
            aria-label="Close filters"
          />
          <div
            className="elite-events fixed left-0 right-0 z-40 flex flex-col rounded-t-2xl border-t border-[var(--elite-border)] bg-[var(--elite-bg)] shadow-[0 -8px 32px rgba(0,0,0,0.15)] transition-transform duration-300 ease-out"
            style={{
              bottom: 0,
              maxHeight: "75vh",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            role="dialog"
            aria-label="Filter events"
          >
            <div className="shrink-0 flex justify-center pt-3 pb-2">
              <span className="w-10 h-1 rounded-full bg-[var(--elite-border)]" aria-hidden />
            </div>
            <h3 className="elite-heading text-lg font-semibold text-[var(--elite-text)] px-4 pb-3">Filters</h3>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-6 space-y-4">
              <div role="group" aria-label="Category">
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {ELITE_CATEGORIES.map(({ value, label }) => (
                    <EliteChip
                      key={value || "all"}
                      selected={categoryFilter === value}
                      onClick={() => {
                        hapticTrigger("light");
                        setCategoryFilter(value);
                      }}
                    >
                      {label}
                    </EliteChip>
                  ))}
                </div>
              </div>
              <div role="group" aria-label="Date">
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Date</p>
                <div className="flex flex-wrap gap-2">
                  {DATE_RANGES.map(({ value, label }) => (
                    <EliteChip
                      key={value || "anytime"}
                      selected={dateRange === value}
                      onClick={() => {
                        hapticTrigger("light");
                        setDateRange(value);
                      }}
                    >
                      {label}
                    </EliteChip>
                  ))}
                </div>
              </div>
              <div role="group" aria-label="Location">
                <p className="text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide mb-2">Location</p>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_OPTIONS.map(({ value, label }) => (
                    <EliteChip
                      key={value || "any"}
                      selected={locationFilter === value}
                      onClick={() => {
                        hapticTrigger("light");
                        setLocationFilter(value);
                      }}
                    >
                      {label}
                    </EliteChip>
                  ))}
                </div>
              </div>
            </div>
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-[var(--elite-border)] flex justify-center">
              <button
                type="button"
                onClick={() => setFilterExpanded(false)}
                className="elite-events flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[var(--elite-accent)] text-white focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-offset-2"
                aria-label="Done"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {showTabsAndContentShell && (
        <div
          className="shrink-0 flex border-b border-[var(--elite-border)] bg-[var(--elite-bg)] no-scrollbar overflow-x-auto"
          role="tablist"
          aria-label="Event sections"
        >
          {SECTION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeSection === key}
              aria-controls={`events-panel-${key}`}
              id={`events-tab-${key}`}
              onClick={() => !loading && scrollToSection(key)}
              disabled={loading}
              className={`elite-events shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-inset ${
                activeSection === key
                  ? "border-[var(--elite-accent)] text-[var(--elite-text)]"
                  : "border-transparent text-[var(--elite-text-muted)] hover:text-[var(--elite-text-secondary)]"
              } ${loading ? "pointer-events-none" : ""}`}
            >
              {key === "discover" && (categoryFilter ? "Events" : "Discover")}
              {key === "invited" && "Invited"}
              {key === "going" && "Going to"}
              {key === "spotlight" && "Spotlight"}
              {key === "my" && "My events"}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }} aria-busy="true" aria-label="Loading events">
            <PanelSkeleton />
            <div className="mt-8">
              <PanelSkeleton />
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
            <p className="text-[var(--elite-error)] text-center mb-4">{error}</p>
            <EliteButton variant="primary" onClick={() => loadEvents(true)}>
              Try again
            </EliteButton>
          </div>
        ) : !showSectionTabsAndPanels ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
            <p className="text-[var(--elite-text-secondary)] text-center mb-4">
              No gatherings yet.
              <br />
              Be the first to host an experience for the community.
            </p>
            <Link href="/app/events/new">
              <EliteButton variant="primary">Create Event</EliteButton>
            </Link>
          </div>
        ) : (
          <>
            {/* Horizontal swipe: one full-width page per section */}
            <div
              ref={scrollContainerRef}
              className="flex-1 flex min-h-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar transition-opacity duration-[var(--elite-transition)]"
              style={{ WebkitOverflowScrolling: "touch" }}
              aria-label="Event sections"
            >
              {/* Page 1: Discover */}
              <div
                id="events-panel-discover"
                role="tabpanel"
                aria-labelledby="events-tab-discover"
                className="shrink-0 w-full min-h-0 snap-start snap-always overflow-y-auto overflow-x-hidden flex flex-col p-4 md:p-6"
                style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
              >
                {filterLoading ? (
                  <PanelSkeleton />
                ) : (
                  <DiscoverSection
                    discoverEvents={discoverEvents}
                    hasMore={hasMore}
                    loadMoreLoading={loadMoreLoading}
                    loadMore={loadMore}
                    categoryFilter={categoryFilter}
                    currentUserId={currentUserId}
                  />
                )}
              </div>

              {/* Page 2: Invited */}
              <div
                id="events-panel-invited"
                role="tabpanel"
                aria-labelledby="events-tab-invited"
                className="shrink-0 w-full min-h-0 snap-start snap-always overflow-y-auto overflow-x-hidden flex flex-col p-4 md:p-6"
                style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
              >
                {filterLoading ? (
                  <PanelSkeleton />
                ) : (
                  <SectionWithPast title="Invited" events={invitedEvents} emptyMessage="Event invitations will appear here." currentUserId={currentUserId} />
                )}
              </div>

              {/* Page 3: Going to */}
              <div
                id="events-panel-going"
                role="tabpanel"
                aria-labelledby="events-tab-going"
                className="shrink-0 w-full min-h-0 snap-start snap-always overflow-y-auto overflow-x-hidden flex flex-col p-4 md:p-6"
                style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
              >
                {filterLoading ? (
                  <PanelSkeleton />
                ) : (
                  <SectionWithPast title="Going to" events={goingTo} emptyMessage="Events you're attending will appear here." currentUserId={currentUserId} />
                )}
              </div>

              {/* Page 4: Spotlight */}
              <div
                id="events-panel-spotlight"
                role="tabpanel"
                aria-labelledby="events-tab-spotlight"
                className="shrink-0 w-full min-h-0 snap-start snap-always overflow-y-auto overflow-x-hidden flex flex-col p-4 md:p-6"
                style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
              >
                {filterLoading ? (
                  <PanelSkeleton />
                ) : (
                  <SpotlightSection
                    spotlightEvents={spotlightEvents}
                    categoryFilter={categoryFilter}
                    currentUserId={currentUserId}
                  />
                )}
              </div>

              {/* Page 5: My events */}
              <div
                id="events-panel-my"
                role="tabpanel"
                aria-labelledby="events-tab-my"
                className="shrink-0 w-full min-h-0 snap-start snap-always overflow-y-auto overflow-x-hidden flex flex-col p-4 md:p-6"
                style={{ WebkitOverflowScrolling: "touch", paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
              >
                {filterLoading ? (
                  <PanelSkeleton />
                ) : (
                  <MyEventsSection myEvents={myEvents} currentUserId={currentUserId} />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {isActive && (
        <div
          className="elite-events fixed bottom-0 right-0 z-20 flex flex-col items-center gap-2"
          style={{
            bottom: "calc(1rem + var(--safe-area-inset-bottom))",
            right: "calc(1rem + var(--safe-area-inset-right))",
          }}
        >
          {showTabsAndContentShell && (
            <button
              type="button"
              onClick={() => {
                hapticTrigger("light");
                setFilterExpanded((v) => !v);
              }}
              disabled={loading}
              className="elite-events relative flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-black text-white border border-white/20 shadow-[var(--elite-shadow)] transition-all duration-[var(--elite-transition)] hover:scale-105 hover:bg-neutral-800 active:scale-[0.98] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-offset-2 disabled:opacity-70"
              aria-label={filterExpanded ? "Hide filters" : "Show filters"}
              aria-expanded={filterExpanded}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {hasActiveFilter && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white" aria-hidden />
              )}
            </button>
          )}
          <Link
            href="/app/events/new"
            onClick={() => hapticTrigger("medium")}
            className="elite-events flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-black text-white border border-white/20 shadow-[var(--elite-shadow)] transition-all duration-[var(--elite-transition)] hover:scale-105 hover:bg-neutral-800 active:scale-[0.98] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-offset-2"
            aria-label="Create Event"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
