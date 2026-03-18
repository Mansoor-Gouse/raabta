"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuestionCard, type QaQuestionCard } from "@/components/qa/reddit/QuestionCard";
import { SortTabs } from "@/components/qa/reddit/SortTabs";
import { MoreSheet } from "@/components/qa/MoreSheet";

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
  score?: number;
  myVote?: 1 | 0 | -1;
  contextType?: string;
  contextId?: string | null;
  authorLabel?: string;
  savedByMe?: boolean;
};

type ListResponse = {
  questions: QuestionListItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

function QuestionCardSkeleton() {
  return (
    <div className="qa-card flex gap-3 animate-pulse">
      <div className="pt-1">
        <div className="bg-[var(--qa-rail-bg)] border border-[var(--qa-rail-border)] rounded-md px-1 py-2 flex flex-col items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-black/10 dark:bg-white/10" />
          <div className="w-7 h-3 rounded bg-black/10 dark:bg-white/10" />
          <div className="w-9 h-9 rounded-md bg-black/10 dark:bg-white/10" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="h-3 w-40 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-4 w-5/6 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-3 w-4/6 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-20 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-7 w-16 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-7 w-16 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export default function QnaPage() {
  const searchParams = useSearchParams();
  const contextType = searchParams.get("contextType");
  const contextId = searchParams.get("contextId");
  const [items, setItems] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [sort, setSort] = useState<"hot" | "new" | "top">("new");
  const [topWindow, setTopWindow] = useState<"today" | "week" | "month" | "all">("week");
  const [moreForId, setMoreForId] = useState<string | null>(null);
  const askHref =
    contextType && contextId
      ? `/app/qa/ask?contextType=${encodeURIComponent(contextType)}&contextId=${encodeURIComponent(
          contextId
        )}`
      : "/app/qa/ask";

  async function load(cursor?: string, replace = false) {
    const params = new URLSearchParams();
    params.set("limit", "20");
    params.set("sort", sort);
    if (sort === "top") params.set("window", topWindow);
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
  }, [sort, topWindow]);

  async function voteQuestion(questionId: string, value: 1 | 0 | -1) {
    setItems((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const prevVote = q.myVote ?? 0;
        const nextVote = value;
        const delta = nextVote - prevVote;
        return { ...q, myVote: nextVote, score: (q.score ?? 0) + delta };
      })
    );
    await fetch(`/api/qa/questions/${questionId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ value }),
    }).catch(() => {});
  }

  async function toggleSave(questionId: string) {
    const current = items.find((q) => q.id === questionId)?.savedByMe ?? false;
    setItems((prev) => prev.map((q) => (q.id === questionId ? { ...q, savedByMe: !current } : q)));
    await fetch(`/api/qa/questions/${questionId}/save`, {
      method: current ? "DELETE" : "POST",
      credentials: "include",
    }).catch(() => {});
  }

  async function share(questionId: string) {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/app/qa/${questionId}`
        : `/app/qa/${questionId}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-full bg-[var(--ig-bg)] flex flex-col" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)]">
        <h1 className="text-lg font-semibold text-[var(--ig-text)]">Q&amp;A</h1>
        <div className="flex items-center gap-2">
          <SortTabs
            tabs={[
              { id: "hot", label: "Hot" },
              { id: "new", label: "New" },
              { id: "top", label: "Top" },
            ]}
            activeId={sort}
            onChange={(id) => setSort(id as "hot" | "new" | "top")}
          />
          {sort === "top" && (
            <SortTabs
              tabs={[
                { id: "today", label: "Today" },
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
                { id: "all", label: "All" },
              ]}
              activeId={topWindow}
              onChange={(id) => setTopWindow(id as "today" | "week" | "month" | "all")}
            />
          )}
          <Link
            href="/app/qa/saved"
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] text-xs font-semibold"
          >
            Saved
          </Link>
          <Link
            href={askHref}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-xs font-semibold"
          >
            Ask
          </Link>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="px-4 py-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <QuestionCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-[var(--ig-text-secondary)]">
            No questions yet.
            <div className="mt-3">
              <Link
                href={askHref}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-sm font-semibold"
              >
                Ask the first question
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {contextType && contextId && (
              <div className="text-xs text-[var(--qa-meta)] font-semibold">
                Event Q&amp;A
              </div>
            )}
            {items.map((q) => {
              const card: QaQuestionCard = {
                _id: q.id,
                title: q.title,
                body: q.body,
                topics: q.topics,
                contextLabel: q.contextType && q.contextType !== "none" ? q.contextType : null,
                answerCount: q.answerCount,
                createdAt: q.createdAt,
                score: q.score ?? 0,
                myVote: q.myVote ?? 0,
                authorLabel: q.authorLabel,
              };
              return (
                <QuestionCard
                  key={q.id}
                  q={card}
                  compact
                  onVote={(v) => voteQuestion(q.id, v)}
                  onShare={() => share(q.id)}
                  onSave={() => toggleSave(q.id)}
                  saved={q.savedByMe ?? false}
                  onMore={() => setMoreForId(q.id)}
                />
              );
            })}
          </div>
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

      <MoreSheet
        open={!!moreForId}
        onClose={() => setMoreForId(null)}
        link={
          typeof window !== "undefined" && moreForId
            ? `${window.location.origin}/app/qa/${moreForId}`
            : `/app/qa/${moreForId ?? ""}`
        }
        reportTargetType="qa_question"
        reportTargetId={moreForId ?? ""}
      />
    </div>
  );
}

