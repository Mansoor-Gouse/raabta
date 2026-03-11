"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MemberCard, type MemberCardData } from "@/components/members/MemberCard";
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
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white via-slate-50/80 to-white px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-md shadow-slate-200/60 transition-shadow hover:shadow-lg hover:shadow-black/5">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-black/12 to-black/5 text-slate-800">
              <IconMembers className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Members</h1>
              <p className="text-sm text-slate-600">
                Discover people · Build your circles
              </p>
            </div>
          </div>
          <div className="mt-4 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <IconSearch className="w-5 h-5" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, city, profession, expertise..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-300 transition-all"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <IconFilter className="w-3.5 h-3.5" />
              Filter
            </span>
            {(["any", "inner", "trusted", "not_in_circle"] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setInNetwork(val)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                  inNetwork === val
                    ? "bg-gradient-to-r from-black/15 to-black/8 text-slate-900 shadow-md shadow-black/10"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800 hover:scale-[1.02]"
                }`}
              >
                {filterLabels[val].icon}
                {filterLabels[val].label}
              </button>
            ))}
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-slate-400 pointer-events-none">
                <IconLocation className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-28 rounded-lg border border-slate-200 bg-slate-50/80 pl-8 pr-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
              />
            </div>
          </div>
        </header>

        {(discoveryByCity.length > 0 || discoveryEducation.length > 0) && (
          <section className="space-y-5">
            {discoveryByCity.length > 0 && userLocation && (
              <div className="opacity-100 transition-all duration-300">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-black/12 to-black/5 text-slate-800">
                    <IconRocket className="w-4 h-4" />
                  </span>
                  Entrepreneurs in your city
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth scrollbar-thin">
                  {discoveryByCity.map((m, i) => (
                    <div key={m.id} className="flex shrink-0" style={{ animationDelay: `${i * 40}ms` }}>
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
              <div className="opacity-100 transition-all duration-300">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-black/12 to-black/5 text-slate-800">
                    <IconSparkles className="w-4 h-4" />
                  </span>
                  Members active in education
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
                  {discoveryEducation.map((m, i) => (
                    <div key={m.id} className="flex shrink-0">
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/60">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-black/12 to-black/5 text-slate-800">
                <IconMembers className="w-4 h-4" />
              </span>
              Directory
            </h2>
            {meta && (
              <span className="rounded-full bg-gradient-to-r from-black/8 to-black/4 px-2.5 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
                {meta.total} member{meta.total === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {loading && members.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse"
                />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-black/10 to-black/5 text-slate-500 mb-3">
                <IconSearch className="w-7 h-7" />
              </span>
              <p className="text-sm font-medium text-slate-700">No one here yet</p>
              <p className="text-xs text-slate-500 mt-1">Try different filters or search terms — your people are out there.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-gradient-to-r from-black/8 to-black/4 px-5 py-2.5 text-sm font-medium text-slate-800 hover:from-black/12 hover:to-black/6 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
                  >
                    {loading ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/60">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-black/12 to-black/5 text-slate-800">
              <IconSparkles className="w-4 h-4" />
            </span>
            People you may want to know
          </h2>
          <p className="text-xs text-slate-600 mb-4 ml-9">
            Based on shared events and trusted connections.
          </p>
          {suggestions.length === 0 ? (
            <div className="py-6 flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-black/10 to-black/5 text-slate-500 mb-2">
                <IconSparkles className="w-6 h-6" />
              </span>
              <p className="text-xs text-slate-500">No suggestions yet. Attend events and grow your circles to see recommendations here.</p>
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
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 hover:text-black transition-colors"
            >
              <IconCircleInner className="w-3.5 h-3.5" />
              Manage my circles
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
