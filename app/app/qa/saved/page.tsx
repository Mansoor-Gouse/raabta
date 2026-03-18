"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QuestionCard, type QaQuestionCard } from "@/components/qa/reddit/QuestionCard";

type QuestionListItem = {
  id: string;
  title: string;
  body: string;
  topics: string[];
  answerCount: number;
  createdAt: string;
  score?: number;
  myVote?: 1 | 0 | -1;
  authorLabel?: string;
  savedByMe?: boolean;
};

export default function SavedQuestionsPage() {
  const [items, setItems] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/qa/questions?saved=1&limit=50&sort=new", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems((d?.questions ?? []) as QuestionListItem[]))
      .finally(() => setLoading(false));
  }, []);

  async function unsave(questionId: string) {
    setItems((prev) => prev.filter((q) => q.id !== questionId));
    await fetch(`/api/qa/questions/${questionId}/save`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
  }

  return (
    <div className="min-h-full bg-[var(--ig-bg)] flex flex-col" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)]">
        <h1 className="text-lg font-semibold text-[var(--ig-text)]">Saved</h1>
        <Link href="/app/qa" className="text-xs font-semibold text-[var(--ig-link)]">
          Back to Q&amp;A
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-sm text-[var(--ig-text-secondary)]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-[var(--ig-text-secondary)]">No saved questions yet.</div>
        ) : (
          items.map((q) => {
            const card: QaQuestionCard = {
              _id: q.id,
              title: q.title,
              body: q.body,
              topics: q.topics,
              contextLabel: null,
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
                saved
                onSave={() => unsave(q.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

