"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MemberCard, type MemberCardData } from "@/components/members/MemberCard";
import { MemberCardSkeleton } from "@/components/members/MemberCardSkeleton";
import { EliteSection, EliteChip, EliteButton } from "@/components/elite";
import {
  IconSearch,
  IconLocation,
  IconSparkles,
  IconMembers,
  IconFilter,
  IconCircleInner,
  IconTrusted,
  IconRocket,
} from "@/components/layout/InstagramIcons";

type MembersResponse = {
  members: MemberCardData[];
  facets: { locations: string[]; industries: string[]; interests: string[]; expertise: string[]; communityRoles: string[] };
  meta: { page: number; pageSize: number; total: number; hasMore: boolean };
};

type Suggestion = {
  id: string;
  fullName?: string;
  name?: string;
  profileImage?: string;
  image?: string;
  headline?: string;
  eventsAttendedTogether?: number;
  sharedTrustedCount?: number;
};

const INNER_MAX = 12;
const TRUSTED_MAX = 50;

function buildMembersUrl(params: {
  q?: string;
  city?: string;
  profession?: string;
  industry?: string;
  expertise?: string;
  interests?: string;
  communityRole?: string;
  inNetwork?: string;
  page?: number;
  pageSize?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.city) searchParams.set("city", params.city);
  if (params.profession) searchParams.set("profession", params.profession);
  if (params.industry) searchParams.set("industry", params.industry);
  if (params.expertise) searchParams.set("expertise", params.expertise);
  if (params.interests) searchParams.set("interests", params.interests);
  if (params.communityRole) searchParams.set("communityRole", params.communityRole);
  if (params.inNetwork && params.inNetwork !== "any") searchParams.set("inNetwork", params.inNetwork);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  return `/api/members?${searchParams.toString()}`;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberCardData[]>([]);
  const [meta, setMeta] = useState<MembersResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [city, setCity] = useState("");
  const [inNetwork, setInNetwork] = useState<string>("any");
  const [page, setPage] = useState(1);
  const [innerCount, setInnerCount] = useState(0);
  const [trustedCount, setTrustedCount] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [discoveryByCity, setDiscoveryByCity] = useState<MemberCardData[]>([]);
  const [discoveryEducation, setDiscoveryEducation] = useState<MemberCardData[]>([]);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadCircleCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/circles/my");
      if (res.ok) {
        const data = await res.json();
        setInnerCount((data.inner ?? []).length);
        setTrustedCount((data.trusted ?? []).length);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/circles/suggestions");
      if (res.ok) {
        const data = await res.json();
        const list = (data.suggestions ?? []).map((s: Suggestion) => ({
          id: s.id,
          fullName: s.fullName,
          name: s.name,
          headline: s.headline,
          profileImage: s.profileImage || s.image,
          circleTypeForMe: null,
          eventsAttendedTogether: s.eventsAttendedTogether ?? 0,
          sharedTrustedCount: s.sharedTrustedCount ?? 0,
          mutualConnectionsCount: s.sharedTrustedCount ?? 0,
        }));
        setSuggestions(list);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  const loadMembers = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      setLoading(true);
      try {
        const url = buildMembersUrl({
          q: debouncedQuery || undefined,
          city: city || undefined,
          inNetwork: inNetwork !== "any" ? inNetwork : undefined,
          page: pageNum,
          pageSize: 24,
        });
        const res = await fetch(url);
        if (!res.ok) {
          if (!append) setMembers([]);
          setMeta(null);
          return;
        }
        const data: MembersResponse = await res.json();
        setMembers(append ? (prev) => [...prev, ...data.members] : data.members);
        setMeta(data.meta);
      } catch {
        if (!append) setMembers([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    },
    [debouncedQuery, city, inNetwork]
  );

  useEffect(() => {
    setPage(1);
    loadMembers(1, false);
  }, [loadMembers]);

  useEffect(() => {
    loadCircleCounts();
    loadSuggestions();
    const handler = () => {
      loadCircleCounts();
      loadMembers(1, false);
    };
    window.addEventListener("circles-updated", handler);
    return () => window.removeEventListener("circles-updated", handler);
  }, [loadCircleCounts, loadSuggestions]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((me: { location?: string } | null) => {
        if (me?.location) setUserLocation(me.location);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    fetch(buildMembersUrl({ city: userLocation, industry: "Entrepreneur", pageSize: 10 }))
      .then((r) => r.ok ? r.json() : null)
      .then((data: MembersResponse | null) => {
        if (data?.members?.length) setDiscoveryByCity(data.members);
      })
      .catch(() => {});
  }, [userLocation]);

  useEffect(() => {
    fetch(buildMembersUrl({ interests: "Education", pageSize: 10 }))
      .then((r) => r.ok ? r.json() : null)
      .then((data: MembersResponse | null) => {
        if (data?.members?.length) setDiscoveryEducation(data.members);
      })
      .catch(() => {});
  }, []);

  const loadMore = useCallback(() => {
    if (!meta?.hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    loadMembers(next, true);
  }, [meta, page, loading, loadMembers]);

  const filterLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    any: { label: "Everyone", icon: <IconMembers className="w-3.5 h-3.5" /> },
    inner: { label: "Inner Circle", icon: <IconCircleInner className="w-3.5 h-3.5" /> },
    trusted: { label: "Trusted Circle", icon: <IconTrusted className="w-3.5 h-3.5" /> },
    not_in_circle: { label: "Not in my circles", icon: <IconFilter className="w-3.5 h-3.5" /> },
  };

  return (
    <div className="elite-events flex-1 flex flex-col min-h-full bg-[var(--elite-bg)] overflow-y-auto">
      <header
        className="sticky top-0 z-10 flex items-center px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)]">
          Members
        </h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-6">
        <section className="elite-events rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-4 transition-all duration-[var(--elite-transition)]">
          <p className="elite-body text-sm text-[var(--elite-text-secondary)] mb-4">
            Discover people · Build your circles
          </p>
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--elite-text-muted)] pointer-events-none">
              <IconSearch className="w-5 h-5" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, city, profession, expertise..."
              className="elite-body w-full min-h-[38px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] pl-10 pr-4 py-2 text-sm text-[var(--elite-text)] placeholder-[var(--elite-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--elite-accent)] focus:border-transparent transition-colors duration-[var(--elite-transition)]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="elite-body flex items-center gap-1.5 text-xs font-medium text-[var(--elite-text-muted)] uppercase tracking-wide">
              <IconFilter className="w-3.5 h-3.5" />
              Filter
            </span>
            {(["any", "inner", "trusted", "not_in_circle"] as const).map((val) => (
              <EliteChip
                key={val}
                selected={inNetwork === val}
                onClick={() => setInNetwork(val)}
                className="inline-flex items-center gap-1.5"
              >
                {filterLabels[val].icon}
                {filterLabels[val].label}
              </EliteChip>
            ))}
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-[var(--elite-text-muted)] pointer-events-none">
                <IconLocation className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="elite-body w-28 min-h-[32px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] pl-8 pr-2 py-1.5 text-xs text-[var(--elite-text)] placeholder-[var(--elite-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--elite-accent)] transition-colors duration-[var(--elite-transition)]"
              />
            </div>
          </div>
        </section>

        {(discoveryByCity.length > 0 || discoveryEducation.length > 0) && (
          <section className="elite-events space-y-5">
            {discoveryByCity.length > 0 && userLocation && (
              <div className="elite-card-in transition-opacity duration-[var(--elite-transition)]">
                <h2 className="elite-heading flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--elite-text)] mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[var(--elite-radius)] bg-[var(--elite-border-light)] text-[var(--elite-text)]">
                    <IconRocket className="w-4 h-4" />
                  </span>
                  Entrepreneurs in your city
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
                  {discoveryByCity.map((m, i) => (
                    <div key={m.id} className="flex shrink-0 snap-start">
                      <MemberCard
                        member={m}
                        innerCount={innerCount}
                        trustedCount={trustedCount}
                        compact
                        onUpdated={loadCircleCounts}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {discoveryEducation.length > 0 && (
              <div className="elite-card-in transition-opacity duration-[var(--elite-transition)]">
                <h2 className="elite-heading flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--elite-text)] mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[var(--elite-radius)] bg-[var(--elite-border-light)] text-[var(--elite-text)]">
                    <IconSparkles className="w-4 h-4" />
                  </span>
                  Members active in education
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
                  {discoveryEducation.map((m) => (
                    <div key={m.id} className="flex shrink-0 snap-start">
                      <MemberCard
                        member={m}
                        innerCount={innerCount}
                        trustedCount={trustedCount}
                        compact
                        onUpdated={loadCircleCounts}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <EliteSection title="Directory">
          <div className="flex items-center justify-between gap-2 mb-4">
            {meta && (
              <span className="elite-body rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--elite-text-secondary)] tabular-nums">
                {meta.total} member{meta.total === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {loading && members.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <MemberCardSkeleton key={i} delay={i * 50} />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-surface)]/50">
              <span className="flex h-14 w-14 items-center justify-center rounded-[var(--elite-radius-lg)] bg-[var(--elite-border-light)] text-[var(--elite-text-muted)] mb-3">
                <IconSearch className="w-7 h-7" />
              </span>
              <p className="elite-body text-sm font-medium text-[var(--elite-text)]">No one here yet</p>
              <p className="elite-body text-xs text-[var(--elite-text-muted)] mt-1">Try different filters or search terms — your people are out there.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    innerCount={innerCount}
                    trustedCount={trustedCount}
                    onUpdated={() => {
                      loadCircleCounts();
                      loadMembers(page, false);
                    }}
                  />
                ))}
              </div>
              {meta?.hasMore && (
                <div className="mt-6 flex justify-center">
                  <EliteButton
                    variant="secondary"
                    onClick={loadMore}
                    disabled={loading}
                    loading={loading}
                    ariaLabel="Load more members"
                  >
                    {loading ? "Loading…" : "Load more"}
                  </EliteButton>
                </div>
              )}
            </>
          )}
        </EliteSection>

        <EliteSection title="People you may want to know">
          <p className="elite-body text-xs text-[var(--elite-text-muted)] mb-4">
            Based on shared events and trusted connections.
          </p>
          {suggestions.length === 0 ? (
            <div className="py-6 flex flex-col items-center text-center rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-surface)]/50">
              <span className="flex h-12 w-12 items-center justify-center rounded-[var(--elite-radius)] bg-[var(--elite-border-light)] text-[var(--elite-text-muted)] mb-2">
                <IconSparkles className="w-6 h-6" />
              </span>
              <p className="elite-body text-xs text-[var(--elite-text-muted)]">No suggestions yet. Attend events and grow your circles to see recommendations here.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              {suggestions.slice(0, 6).map((s) => (
                <MemberCard
                  key={s.id}
                  member={{
                    id: s.id,
                    fullName: s.fullName,
                    name: s.name,
                    headline: s.headline,
                    profileImage: s.profileImage || s.image,
                    circleTypeForMe: null,
                    eventsAttendedTogether: s.eventsAttendedTogether ?? 0,
                    sharedTrustedCount: s.sharedTrustedCount ?? 0,
                    mutualConnectionsCount: s.sharedTrustedCount ?? 0,
                  }}
                  innerCount={innerCount}
                  trustedCount={trustedCount}
                  onUpdated={() => {
                    loadCircleCounts();
                    loadSuggestions();
                  }}
                />
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link
              href="/app/profile/circles"
              className="elite-events inline-flex items-center gap-1.5 text-sm font-medium text-[var(--elite-accent)] hover:text-[var(--elite-accent-hover)] transition-colors"
            >
              <IconCircleInner className="w-3.5 h-3.5" />
              Manage my circles
            </Link>
          </div>
        </EliteSection>
      </div>
    </div>
  );
}
