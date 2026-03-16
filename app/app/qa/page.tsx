"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type QuestionListItem = {
  id: string;
  title: string;
  body: string;
  topics: string[];
  city: string | null;
  status: "open" | "resolved" | "archived";
  answerCount: number;
  hasAcceptedAnswer: boolean;
  createdAt: string;
};

type ListResponse = {
  questions: QuestionListItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

export default function QnaPage() {
  const searchParams = useSearchParams();
  const contextType = searchParams.get("contextType");
  const contextId = searchParams.get("contextId");
  const [items, setItems] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [sort, setSort] = useState<"latest" | "unanswered">("latest");

  async function load(cursor?: string, replace = false) {
    const params = new URLSearchParams();
    params.set("limit", "20");
    params.set("sort", sort);
    if (contextType && contextId) {
      params.set("contextType", contextType);
      params.set("contextId", contextId);
    }
    if (cursor) params.set("cursor", cursor);
    const url = `/api/qa/questions?${params.toString()}`;
    const res = await fetch(url, { credentials: "include" });
    const data: ListResponse = await res.json();
    setItems((prev) => (replace ? data.questions : [...prev, ...data.questions]));
    setHasMore(data.hasMore);
    setNextCursor(data.nextCursor);
  }

  useEffect(() => {
    setLoading(true);
    load(undefined, true).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  return (
    <div className="min-h-full bg-[var(--ig-bg)] flex flex-col" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)]">
        <h1 className="text-lg font-semibold text-[var(--ig-text)]">Q&amp;A</h1>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "latest" | "unanswered")}
            className="text-xs rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] px-2 py-1"
          >
            <option value="latest">Latest</option>
            <option value="unanswered">Unanswered</option>
          </select>
          <Link
            href="/app/qa/ask"
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-xs font-semibold"
          >
            Ask
          </Link>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="p-4 text-[var(--ig-text-secondary)]">Loading questions…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-[var(--ig-text-secondary)]">
            No questions yet.
            <div className="mt-3">
              <Link
                href="/app/qa/ask"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-sm font-semibold"
              >
                Ask the first question
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--ig-border)]">
            {items.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/app/qa/${q.id}`}
                  className="block px-4 py-3 hover:bg-[var(--ig-border-light)]"
                >
                  <p className="text-sm font-semibold text-[var(--ig-text)] line-clamp-2">
                    {q.title}
                  </p>
                  {q.body && (
                    <p className="mt-1 text-xs text-[var(--ig-text-secondary)] line-clamp-2">
                      {q.body}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--ig-text-secondary)]">
                    <div className="flex flex-wrap gap-1">
                      {q.topics.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-[var(--ig-border-light)] text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                      {q.city && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--ig-border-light)] text-[10px]">
                          {q.city}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {q.hasAcceptedAnswer && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">
                          Resolved
                        </span>
                      )}
                      <span>{q.answerCount} answers</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {hasMore && nextCursor && (
          <div className="p-4 text-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => {
                if (!nextCursor) return;
                setLoadingMore(true);
                load(nextCursor).finally(() => setLoadingMore(false));
              }}
              className="text-sm font-medium text-[var(--ig-accent)] hover:underline disabled:opacity-50"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

