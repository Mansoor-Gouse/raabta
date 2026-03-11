"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AddToCircleButton } from "@/components/circles/AddToCircleButton";

type CircleMember = {
  id: string;
  fullName?: string;
  name?: string;
  profileImage?: string;
  image?: string;
  headline?: string;
  reason?: string;
  createdAt?: string;
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

export default function CirclesPage() {
  const [inner, setInner] = useState<CircleMember[]>([]);
  const [trusted, setTrusted] = useState<CircleMember[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [innerCount, setInnerCount] = useState(0);
  const [trustedCount, setTrustedCount] = useState(0);
  const [networkQuery, setNetworkQuery] = useState("");
  const [networkResults, setNetworkResults] = useState<CircleMember[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, suggestionsRes] = await Promise.all([
        fetch("/api/circles/my"),
        fetch("/api/circles/suggestions"),
      ]);
      if (myRes.ok) {
        const data = await myRes.json();
        setInner(data.inner ?? []);
        setTrusted(data.trusted ?? []);
        setInnerCount((data.inner ?? []).length);
        setTrustedCount((data.trusted ?? []).length);
      }
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(data.suggestions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("circles-updated", handler);
    return () => window.removeEventListener("circles-updated", handler);
  }, [load]);

  const moveToTrusted = async (relatedUserId: string) => {
    const res = await fetch("/api/circles/update-type", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relatedUserId, circleType: "TRUSTED" }),
    });
    if (res.ok) load();
  };

  const moveToInner = async (relatedUserId: string) => {
    const res = await fetch("/api/circles/update-type", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relatedUserId, circleType: "INNER" }),
    });
    if (res.ok) load();
  };

  const remove = async (relatedUserId: string) => {
    const res = await fetch("/api/circles/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relatedUserId }),
    });
    if (res.ok) load();
  };

  const searchNetwork = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (q.length < 2) {
        setNetworkResults([]);
        return;
      }
      setNetworkLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&type=users&limit=20`,
          { credentials: "include" }
        );
        if (!res.ok) {
          setNetworkResults([]);
          return;
        }
        const data = await res.json();
        const users = Array.isArray(data.users) ? data.users : [];
        const existingIds = new Set([
          ...inner.map((m) => m.id),
          ...trusted.map((m) => m.id),
        ]);
        const mapped: CircleMember[] = users
          .filter((u: { _id: string }) => !existingIds.has(u._id))
          .map(
            (u: {
              _id: string;
              fullName?: string;
              name?: string;
              profileImage?: string;
              image?: string;
              headline?: string;
            }) => ({
              id: u._id,
              fullName: u.fullName,
              name: u.name,
              profileImage: u.profileImage,
              image: u.image,
              headline: u.headline,
            })
          );
        setNetworkResults(mapped);
      } finally {
        setNetworkLoading(false);
      }
    },
    [inner, trusted]
  );

  useEffect(() => {
    const t = setTimeout(() => searchNetwork(networkQuery), 300);
    return () => clearTimeout(t);
  }, [networkQuery, searchNetwork]);

  const name = (m: CircleMember | Suggestion) =>
    m.fullName || m.name || "Member";
  const avatar = (m: CircleMember | Suggestion) => m.profileImage || m.image;

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-black via-slate-950 to-slate-950 px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-40 rounded-xl bg-white/10 animate-pulse" />
          <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-black via-slate-950 to-slate-950 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl shadow-xl shadow-black/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-slate-50">
                Inner &amp; Trusted Circles
              </h1>
              <p className="text-xs text-slate-300/80">
                Curate a small, intentional council for your most meaningful
                collaborations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/80 to-pink-500/80 px-3 py-1 text-xs font-medium text-white shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Inner&nbsp;{innerCount}/12
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-100 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                  Trusted&nbsp;{trustedCount}/50
                </span>
              </div>
              <Link
                href="/app/members"
                className="text-xs font-medium text-amber-200/90 hover:text-amber-100"
              >
                Open Members Directory
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/40">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-slate-50">
                Inner Circle
              </h2>
              <p className="mt-0.5 text-xs text-slate-300/80">
                Highest trust. Keep this very small and deeply intentional.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {inner.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/15 bg-black/40 py-6 text-center text-xs text-slate-400">
                No one in your Inner Circle yet. Start with the few people whose
                counsel you truly rely on.
              </li>
            ) : (
              inner.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-white/0 p-3 hover:border-amber-400/60 transition-colors"
                >
                  <Link
                    href={`/app/members/${m.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {avatar(m) ? (
                      <img
                        src={avatar(m)!}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-amber-400/70 ring-offset-2 ring-offset-black"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-pink-500 text-sm font-semibold text-white">
                        {name(m).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-50">
                        {name(m)}
                      </p>
                      {m.reason && (
                        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-amber-200/90">
                          {m.reason.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => moveToTrusted(m.id)}
                      className="rounded-full border border-amber-300/60 bg-black/40 px-3 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20"
                    >
                      Move to Trusted
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-200 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/40">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-slate-50">
                Trusted Circle
              </h2>
              <p className="mt-0.5 text-xs text-slate-300/80">
                People whose judgment you trust and enjoy collaborating with.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {trusted.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/15 bg-black/40 py-6 text-center text-xs text-slate-400">
                No one in your Trusted Circle yet. Start by adding people you
                would happily vouch for.
              </li>
            ) : (
              trusted.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-white/5 via-white/5 to-white/0 p-3 hover:border-slate-300/70 transition-colors"
                >
                  <Link
                    href={`/app/members/${m.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {avatar(m) ? (
                      <img
                        src={avatar(m)!}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-300/60 ring-offset-1 ring-offset-black"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-sm font-semibold text-white">
                        {name(m).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-50">
                        {name(m)}
                      </p>
                      {m.reason && (
                        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-300/90">
                          {m.reason.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    {innerCount < 12 && (
                      <button
                        type="button"
                        onClick={() => moveToInner(m.id)}
                        className="rounded-full border border-amber-400/60 bg-black/40 px-3 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20"
                      >
                        Move to Inner
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-200 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/10 to-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/40">
          <h2 className="text-sm font-semibold tracking-wide text-slate-50">
            Explore Network
          </h2>
          <p className="mt-0.5 text-xs text-slate-300/80">
            Search across the wider network and add people directly into your
            circles.
          </p>
          <div className="mt-3">
            <input
              type="text"
              value={networkQuery}
              onChange={(e) => setNetworkQuery(e.target.value)}
              placeholder="Search by name, city, profession..."
              className="w-full rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/70 focus:border-transparent"
            />
            {networkLoading && (
              <p className="mt-1 text-[11px] text-slate-400">Searching…</p>
            )}
          </div>
          {networkResults.length > 0 && (
            <ul className="mt-3 space-y-2">
              {networkResults.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3 hover:border-amber-400/60 transition-colors"
                >
                  <Link
                    href={`/app/members/${u.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {avatar(u) ? (
                      <img
                        src={avatar(u)!}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-xs font-semibold text-white">
                        {name(u).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-50">
                        {name(u)}
                      </p>
                      {u.headline && (
                        <p className="truncate text-[11px] text-slate-400">
                          {u.headline}
                        </p>
                      )}
                    </div>
                  </Link>
                  <AddToCircleButton
                    relatedUserId={u.id}
                    currentCircle={null}
                    innerCount={innerCount}
                    trustedCount={trustedCount}
                    compact
                  />
                </li>
              ))}
            </ul>
          )}
          {!networkLoading && networkQuery.trim().length >= 2 && networkResults.length === 0 && (
            <p className="mt-3 text-xs text-slate-400">
              No matching members found yet. Try a different name or keyword.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/40">
          <h2 className="text-sm font-semibold tracking-wide text-slate-50">
            Suggestions
          </h2>
          <p className="mt-0.5 text-xs text-slate-300/80">
            People you met at events and those with overlapping trusted
            connections.
          </p>
          <ul className="mt-4 space-y-2">
            {suggestions.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/15 bg-black/40 py-6 text-center text-xs text-slate-400">
                No suggestions right now. Attend curated events and connect
                afterwards to see recommendations here.
              </li>
            ) : (
              suggestions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-white/5 via-white/5 to-transparent p-3 hover:border-amber-400/60 transition-colors"
                >
                  <Link
                    href={`/app/members/${s.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {avatar(s) ? (
                      <img
                        src={avatar(s)!}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-pink-500 text-xs font-semibold text-white">
                        {name(s).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-50">
                        {name(s)}
                      </p>
                      {s.headline && (
                        <p className="truncate text-[11px] text-slate-400">
                          {s.headline}
                        </p>
                      )}
                      {(s.eventsAttendedTogether &&
                        s.eventsAttendedTogether > 0) ||
                      (s.sharedTrustedCount &&
                        s.sharedTrustedCount > 0) ? (
                        <p className="mt-0.5 text-[11px] text-slate-300/80">
                          {s.eventsAttendedTogether &&
                            s.eventsAttendedTogether > 0 && (
                              <span>
                                You attended {s.eventsAttendedTogether} event
                                {s.eventsAttendedTogether === 1 ? "" : "s"}{" "}
                                together
                              </span>
                            )}
                          {s.eventsAttendedTogether &&
                            s.eventsAttendedTogether > 0 &&
                            s.sharedTrustedCount &&
                            s.sharedTrustedCount > 0 &&
                            " · "}
                          {s.sharedTrustedCount &&
                            s.sharedTrustedCount > 0 && (
                              <span>
                                You share {s.sharedTrustedCount} trusted
                                connection
                                {s.sharedTrustedCount === 1 ? "" : "s"}
                              </span>
                            )}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                  <AddToCircleButton
                    relatedUserId={s.id}
                    currentCircle={null}
                    innerCount={innerCount}
                    trustedCount={trustedCount}
                    onUpdated={load}
                    compact
                  />
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
