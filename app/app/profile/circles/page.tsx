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
      <div className="flex-1 overflow-y-auto bg-[var(--elite-bg)] no-scrollbar px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-40 rounded-[var(--elite-radius-lg)] bg-[var(--elite-border-light)] animate-pulse" />
          <div className="h-32 rounded-[var(--elite-radius-lg)] bg-[var(--elite-surface)] animate-pulse" />
          <div className="h-32 rounded-[var(--elite-radius-lg)] bg-[var(--elite-surface)] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--elite-bg)] no-scrollbar px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="elite-events rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="elite-heading text-base font-semibold text-[var(--elite-text)]">
                Inner &amp; Trusted Circles
              </h1>
              <p className="elite-body text-xs text-[var(--elite-text-secondary)] mt-0.5">
                Curate a small, intentional council for your most meaningful
                collaborations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="elite-body inline-flex items-center gap-1.5 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2.5 py-1 text-xs font-medium text-[var(--elite-text)]">
                Inner {innerCount}/12
              </span>
              <span className="elite-body inline-flex items-center gap-1.5 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2.5 py-1 text-xs font-medium text-[var(--elite-text-secondary)]">
                Trusted {trustedCount}/50
              </span>
              <Link
                href="/app/members"
                className="elite-events text-xs font-medium text-[var(--elite-accent)] hover:text-[var(--elite-accent-hover)]"
              >
                Open Members Directory
              </Link>
            </div>
          </div>
        </header>

        <section className="elite-events rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="elite-heading text-sm font-semibold tracking-wide text-[var(--elite-text)]">
                Inner Circle
              </h2>
              <p className="elite-body mt-0.5 text-xs text-[var(--elite-text-secondary)]">
                Highest trust. Keep this very small and deeply intentional.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {inner.length === 0 ? (
              <li className="elite-body rounded-[var(--elite-radius)] border border-dashed border-[var(--elite-border)] bg-[var(--elite-surface)] py-6 text-center text-xs text-[var(--elite-text-muted)]">
                No one in your Inner Circle yet. Start with the few people whose
                counsel you truly rely on.
              </li>
            ) : (
              inner.map((m) => (
                <li
                  key={m.id}
                  className="elite-events flex items-center justify-between gap-3 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] p-3 hover:border-[var(--elite-accent-muted)] transition-colors"
                >
                  <Link
                    href={`/app/members/${m.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {avatar(m) ? (
                      <img
                        src={avatar(m)!}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--elite-border)] text-sm font-semibold text-[var(--elite-text-muted)]">
                        {name(m).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="elite-body truncate text-sm font-medium text-[var(--elite-text)]">
                        {name(m)}
                      </p>
                      {m.reason && (
                        <p className="elite-body mt-0.5 text-[11px] uppercase tracking-wide text-[var(--elite-text-secondary)]">
                          {m.reason.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => moveToTrusted(m.id)}
                      className="elite-events rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-[11px] font-medium text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)]"
                    >
                      Move to Trusted
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      className="elite-events rounded-[var(--elite-radius)] border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="elite-events rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="elite-heading text-sm font-semibold tracking-wide text-[var(--elite-text)]">
                Trusted Circle
              </h2>
              <p className="elite-body mt-0.5 text-xs text-[var(--elite-text-secondary)]">
                People whose judgment you trust and enjoy collaborating with.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {trusted.length === 0 ? (
              <li className="elite-body rounded-[var(--elite-radius)] border border-dashed border-[var(--elite-border)] bg-[var(--elite-surface)] py-6 text-center text-xs text-[var(--elite-text-muted)]">
                No one in your Trusted Circle yet. Start by adding people you
                would happily vouch for.
              </li>
            ) : (
              trusted.map((m) => (
                <li
                  key={m.id}
                  className="elite-events flex items-center justify-between gap-3 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] p-3 hover:border-[var(--elite-accent-muted)] transition-colors"
                >
                  <Link
                    href={`/app/members/${m.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {avatar(m) ? (
                      <img
                        src={avatar(m)!}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--elite-border)] text-sm font-semibold text-[var(--elite-text-muted)]">
                        {name(m).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="elite-body truncate text-sm font-medium text-[var(--elite-text)]">
                        {name(m)}
                      </p>
                      {m.reason && (
                        <p className="elite-body mt-0.5 text-[11px] uppercase tracking-wide text-[var(--elite-text-secondary)]">
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
                        className="elite-events rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-[11px] font-medium text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)]"
                      >
                        Move to Inner
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      className="elite-events rounded-[var(--elite-radius)] border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="elite-events rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-4 sm:p-5">
          <h2 className="elite-heading text-sm font-semibold tracking-wide text-[var(--elite-text)]">
            Explore Network
          </h2>
          <p className="elite-body mt-0.5 text-xs text-[var(--elite-text-secondary)]">
            Search across the wider network and add people directly into your
            circles.
          </p>
          <div className="mt-3">
            <input
              type="text"
              value={networkQuery}
              onChange={(e) => setNetworkQuery(e.target.value)}
              placeholder="Search by name, city, profession..."
              className="elite-body w-full rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-4 py-2.5 text-sm text-[var(--elite-text)] placeholder:text-[var(--elite-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--elite-accent)] focus:border-transparent"
            />
            {networkLoading && (
              <p className="elite-body mt-1 text-[11px] text-[var(--elite-text-muted)]">Searching…</p>
            )}
          </div>
          {networkResults.length > 0 && (
            <ul className="mt-3 space-y-2">
              {networkResults.map((u) => (
                <li
                  key={u.id}
                  className="elite-events flex items-center justify-between gap-3 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] p-3 hover:border-[var(--elite-accent-muted)] transition-colors"
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
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--elite-border)] text-xs font-semibold text-[var(--elite-text-muted)]">
                        {name(u).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="elite-body truncate text-sm font-medium text-[var(--elite-text)]">
                        {name(u)}
                      </p>
                      {u.headline && (
                        <p className="elite-body truncate text-[11px] text-[var(--elite-text-muted)]">
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
            <p className="elite-body mt-3 text-xs text-[var(--elite-text-muted)]">
              No matching members found yet. Try a different name or keyword.
            </p>
          )}
        </section>

        <section className="elite-events rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-4 sm:p-5">
          <h2 className="elite-heading text-sm font-semibold tracking-wide text-[var(--elite-text)]">
            Suggestions
          </h2>
          <p className="elite-body mt-0.5 text-xs text-[var(--elite-text-secondary)]">
            People you met at events and those with overlapping trusted
            connections.
          </p>
          <ul className="mt-4 space-y-2">
            {suggestions.length === 0 ? (
              <li className="elite-body rounded-[var(--elite-radius)] border border-dashed border-[var(--elite-border)] bg-[var(--elite-surface)] py-6 text-center text-xs text-[var(--elite-text-muted)]">
                No suggestions right now. Attend curated events and connect
                afterwards to see recommendations here.
              </li>
            ) : (
              suggestions.map((s) => (
                <li
                  key={s.id}
                  className="elite-events flex items-center justify-between gap-3 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] p-3 hover:border-[var(--elite-accent-muted)] transition-colors"
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
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--elite-border)] text-xs font-semibold text-[var(--elite-text-muted)]">
                        {name(s).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="elite-body truncate text-sm font-medium text-[var(--elite-text)]">
                        {name(s)}
                      </p>
                      {s.headline && (
                        <p className="elite-body truncate text-[11px] text-[var(--elite-text-muted)]">
                          {s.headline}
                        </p>
                      )}
                      {(s.eventsAttendedTogether &&
                        s.eventsAttendedTogether > 0) ||
                      (s.sharedTrustedCount &&
                        s.sharedTrustedCount > 0) ? (
                        <p className="elite-body mt-0.5 text-[11px] text-[var(--elite-text-secondary)]">
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
