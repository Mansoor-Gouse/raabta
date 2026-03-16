"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppUser } from "@/components/layout/AppShell";

type Question = {
  id: string;
  title: string;
  body: string;
  topics: string[];
  city: string | null;
  status: "open" | "resolved" | "archived";
  answerCount: number;
  hasAcceptedAnswer: boolean;
  isAnonymousToMembers: boolean;
  createdAt: string;
  askedByUserId: string;
  isFollowing: boolean;
  followerCount: number;
};

type Answer = {
  id: string;
  body: string;
  isAnonymousToMembers: boolean;
  isAcceptedSolution: boolean;
  upvoteCount: number;
  answeredByUserId: string;
  createdAt: string;
};

type DetailResponse = {
  question: Question;
  answers: Answer[];
};

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const user = useAppUser();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerAnon, setAnswerAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [solutionLoadingId, setSolutionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/qa/questions/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res?.error) {
          setError(res.error);
        } else {
          setData(res as DetailResponse);
          setError(null);
        }
      })
      .catch(() => {
        setError("Failed to load question.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const isAsker = data && user.id && data.question.askedByUserId === user.id;

  async function toggleFollow() {
    if (!id || !data || followLoading) return;
    setFollowLoading(true);
    try {
      const shouldUnfollow = data.question.isFollowing;
      const res = await fetch(`/api/qa/questions/${id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: shouldUnfollow ? "unfollow" : "follow" }),
      });
      const payload = await res.json();
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                question: {
                  ...prev.question,
                  isFollowing: payload.following,
                  followerCount: Math.max(
                    0,
                    prev.question.followerCount + (payload.following && !shouldUnfollow ? 1 : shouldUnfollow ? -1 : 0)
                  ),
                },
              }
            : prev
        );
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function toggleSolution(answerId: string, currentlyAccepted: boolean) {
    if (!id || !data || !isAsker || solutionLoadingId) return;
    setSolutionLoadingId(answerId);
    try {
      const res = await fetch(`/api/qa/answers/${answerId}/mark-solution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mark: !currentlyAccepted }),
      });
      const payload = await res.json();
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                question: {
                  ...prev.question,
                  hasAcceptedAnswer: payload.isAcceptedSolution,
                  status: payload.isAcceptedSolution ? "resolved" : "open",
                },
                answers: prev.answers.map((a) => ({
                  ...a,
                  isAcceptedSolution: a.id === answerId ? payload.isAcceptedSolution : payload.isAcceptedSolution ? false : a.isAcceptedSolution,
                })),
              }
            : prev
        );
      }
    } finally {
      setSolutionLoadingId(null);
    }
  }

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    const text = answerText.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/qa/questions/${id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, isAnonymousToMembers: answerAnon }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || "Could not post answer.");
      } else {
        setData((prev) =>
          prev
            ? {
                ...prev,
                question: {
                  ...prev.question,
                  answerCount: prev.question.answerCount + 1,
                },
                answers: [...prev.answers, payload as Answer],
              }
            : prev
        );
        setAnswerText("");
        setAnswerAnon(false);
        setError(null);
      }
    } catch {
      setError("Could not post answer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data && !error) {
    return (
      <div className="min-h-full flex items-center justify-center text-[var(--ig-text-secondary)]">
        Loading…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-full flex items-center justify-center text-[var(--ig-text-secondary)] px-4 text-center">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { question, answers } = data;

  return (
    <div className="min-h-full bg-[var(--ig-bg)] flex flex-col" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
      <header className="sticky top-0 z-10 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)] flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-[var(--ig-text)] line-clamp-2">
            {question.title}
          </h1>
          <p className="mt-1 text-xs text-[var(--ig-text-secondary)]">
            {question.answerCount} answer{question.answerCount === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleFollow}
          disabled={followLoading}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
            question.isFollowing
              ? "bg-[var(--ig-text)] text-[var(--ig-bg-primary)] border-[var(--ig-text)]"
              : "bg-[var(--ig-bg-primary)] text-[var(--ig-text)] border-[var(--ig-border)]"
          }`}
        >
          {question.isFollowing ? "Following" : "Follow"}
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {question.body && (
          <div className="text-sm text-[var(--ig-text)] whitespace-pre-wrap">
            {question.body}
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-[10px] text-[var(--ig-text-secondary)]">
          {question.topics.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full bg-[var(--ig-border-light)]"
            >
              {t}
            </span>
          ))}
          {question.city && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--ig-border-light)]">
              {question.city}
            </span>
          )}
          {question.hasAcceptedAnswer && (
            <span className="px-2 py-0.5 rounded-full bg-green-600/10 text-green-700 dark:text-green-300 border border-green-600/30">
              Resolved
            </span>
          )}
        </div>

        <section>
          <h2 className="text-sm font-semibold text-[var(--ig-text)] mb-2">
            Answers
          </h2>
          {answers.length === 0 ? (
            <p className="text-sm text-[var(--ig-text-secondary)]">
              No answers yet. Be the first to respond.
            </p>
          ) : (
            <ul className="space-y-3">
              {answers.map((a) => {
                const canMark = isAsker;
                const isLoading = solutionLoadingId === a.id;
                return (
                  <li
                    key={a.id}
                    className={`rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] ${
                      a.isAcceptedSolution ? "border-green-600/60" : ""
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{a.body}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--ig-text-secondary)] gap-2">
                      <div className="flex items-center gap-2">
                        {a.isAcceptedSolution && (
                          <span className="text-green-600 dark:text-green-300 font-semibold">
                            Marked as solution
                          </span>
                        )}
                        {canMark && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => toggleSolution(a.id, a.isAcceptedSolution)}
                            className="px-2 py-0.5 rounded-full border border-[var(--ig-border)] text-[10px] text-[var(--ig-text)] disabled:opacity-50"
                          >
                            {a.isAcceptedSolution ? "Unmark solution" : "Mark as solution"}
                          </button>
                        )}
                      </div>
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--ig-text)] mb-2">
            Your answer
          </h2>
          {error && (
            <div className="mb-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={submitAnswer} className="space-y-2">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="Share a thoughtful, concise answer."
              className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] resize-y"
            />
            <label className="flex items-start gap-2 text-xs text-[var(--ig-text)]">
              <input
                type="checkbox"
                checked={answerAnon}
                onChange={(e) => setAnswerAnon(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Answer discreetly
                <span className="block text-[10px] text-[var(--ig-text-secondary)]">
                  Members will see this as from “a member”. Moderators can still see your identity.
                </span>
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting || !answerText.trim()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Posting…" : "Post answer"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

