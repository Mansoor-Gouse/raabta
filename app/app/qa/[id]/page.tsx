"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppUser } from "@/components/layout/AppShell";
import { QuestionCard, type QaQuestionCard } from "@/components/qa/reddit/QuestionCard";
import { AnswerCard, type QaAnswerCard } from "@/components/qa/reddit/AnswerCard";
import { SortTabs } from "@/components/qa/reddit/SortTabs";
import { ReplyDrawer } from "@/components/qa/ReplyDrawer";
import { MoreSheet } from "@/components/qa/MoreSheet";

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
  score?: number;
  myVote?: 1 | 0 | -1;
  authorLabel?: string;
  savedByMe?: boolean;
};

type Answer = {
  id: string;
  body: string;
  isAnonymousToMembers: boolean;
  isAcceptedSolution: boolean;
  upvoteCount: number;
  answeredByUserId: string;
  createdAt: string;
  score?: number;
  myVote?: 1 | 0 | -1;
  authorLabel?: string;
  parentAnswerId?: string | null;
};

type DetailResponse = {
  question: Question;
  answers: Answer[];
};

function ThreadSkeleton() {
  return (
    <div className="px-4 py-4 space-y-4 animate-pulse">
      <div className="qa-card flex gap-3">
        <div className="pt-1">
          <div className="bg-[var(--qa-rail-bg)] border border-[var(--qa-rail-border)] rounded-md px-1 py-2 flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-black/10 dark:bg-white/10" />
            <div className="w-7 h-3 rounded bg-black/10 dark:bg-white/10" />
            <div className="w-9 h-9 rounded-md bg-black/10 dark:bg-white/10" />
          </div>
        </div>
        <div className="flex-1">
          <div className="h-3 w-44 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-5 w-5/6 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-4 w-4/6 rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="qa-card flex gap-3">
          <div className="pt-1">
            <div className="bg-[var(--qa-rail-bg)] border border-[var(--qa-rail-border)] rounded-md px-1 py-2 flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-md bg-black/10 dark:bg-white/10" />
              <div className="w-7 h-3 rounded bg-black/10 dark:bg-white/10" />
              <div className="w-9 h-9 rounded-md bg-black/10 dark:bg-white/10" />
            </div>
          </div>
          <div className="flex-1">
            <div className="h-3 w-32 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-2 h-4 w-5/6 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-2 h-4 w-4/6 rounded bg-black/10 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const user = useAppUser();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedAnswerId, setHighlightedAnswerId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerAnon, setAnswerAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [solutionLoadingId, setSolutionLoadingId] = useState<string | null>(null);
  const [answerSort, setAnswerSort] = useState<"top" | "new">("top");
  const [replyingTo, setReplyingTo] = useState<{ answerId: string; label?: string } | null>(null);
  const [moreTarget, setMoreTarget] = useState<{ type: "qa_question" | "qa_answer"; id: string } | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set(["root"]));

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

  useEffect(() => {
    function syncHash() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const m = hash.match(/^#answer-(.+)$/);
      const answerId = m?.[1] ?? null;
      setHighlightedAnswerId(answerId);
      if (!answerId) return;
      setTimeout(() => {
        const el = document.getElementById(`answer-${answerId}`);
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 50);
      setTimeout(() => setHighlightedAnswerId(null), 2500);
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const isAsker = data && user.id && data.question.askedByUserId === user.id;

  async function voteQuestion(value: 1 | 0 | -1) {
    if (!id) return;
    setData((prev) => {
      if (!prev) return prev;
      const prevVote = prev.question.myVote ?? 0;
      const nextVote = value;
      const delta = nextVote - prevVote;
      return {
        ...prev,
        question: {
          ...prev.question,
          myVote: nextVote,
          score: (prev.question.score ?? 0) + delta,
        },
      };
    });
    await fetch(`/api/qa/questions/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ value }),
    }).catch(() => {});
  }

  async function voteAnswer(answerId: string, value: 1 | 0 | -1) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            answers: prev.answers.map((a) => {
              if (a.id !== answerId) return a;
              const prevVote = a.myVote ?? 0;
              const nextVote = value;
              const delta = nextVote - prevVote;
              return { ...a, myVote: nextVote, score: (a.score ?? 0) + delta };
            }),
          }
        : prev
    );
    await fetch(`/api/qa/answers/${answerId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ value }),
    }).catch(() => {});
  }

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
      <div className="min-h-full bg-[var(--ig-bg)] flex flex-col" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
        <header className="sticky top-0 z-10 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)]">
          <div className="h-5 w-28 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
        </header>
        <ThreadSkeleton />
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
  const sortFn = (a: Answer, b: Answer) => {
    if (answerSort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (b.score ?? 0) - (a.score ?? 0);
  };
  const byParent: Record<string, Answer[]> = {};
  for (const a of answers) {
    const key = a.parentAnswerId ?? "root";
    (byParent[key] ??= []).push(a);
  }
  for (const key of Object.keys(byParent)) {
    byParent[key].sort(sortFn);
  }
  const threaded: Array<{ a: Answer; depth: number; parentKey: string; hasChildren: boolean }> = [];
  const walk = (parentKey: string, depth: number) => {
    const kids = byParent[parentKey] ?? [];
    for (const k of kids) {
      const hasChildren = (byParent[k.id] ?? []).length > 0;
      threaded.push({ a: k, depth, parentKey, hasChildren });
      walk(k.id, depth + 1);
    }
  };
  walk("root", 0);

  const visible = threaded.filter(({ a, depth, parentKey }) => {
    if (depth <= 2) return true;
    return expandedParents.has(parentKey) || expandedParents.has(a.id);
  });

  const collapsedChildCountByParent = new Map<string, number>();
  for (const row of threaded) {
    if (row.depth <= 2) continue;
    const parent = row.parentKey;
    const isVisible = expandedParents.has(parent) || expandedParents.has(row.a.id);
    if (!isVisible) {
      collapsedChildCountByParent.set(parent, (collapsedChildCountByParent.get(parent) ?? 0) + 1);
    }
  }

  const qCard: QaQuestionCard = {
    _id: question.id,
    title: question.title,
    body: question.body,
    topics: question.topics,
    contextLabel: null,
    answerCount: question.answerCount,
    followerCount: question.followerCount,
    createdAt: question.createdAt,
    score: question.score ?? 0,
    myVote: question.myVote ?? 0,
    authorLabel: question.authorLabel,
  };

  async function toggleSaveQuestion() {
    const current = question.savedByMe ?? false;
    setData((prev) => (prev ? { ...prev, question: { ...prev.question, savedByMe: !current } } : prev));
    await fetch(`/api/qa/questions/${question.id}/save`, {
      method: current ? "DELETE" : "POST",
      credentials: "include",
    }).catch(() => {});
  }

  async function shareLink(path: string) {
    const link =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-full bg-[var(--ig-bg)] flex flex-col" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
      <header className="sticky top-0 z-10 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)] flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-[var(--ig-text)] line-clamp-2">Thread</h1>
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <QuestionCard
          q={qCard}
          onVote={voteQuestion}
          saved={question.savedByMe ?? false}
          onSave={toggleSaveQuestion}
          onShare={() => shareLink(`/app/qa/${question.id}`)}
          onMore={() => setMoreTarget({ type: "qa_question", id: question.id })}
        />

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[var(--ig-text)]">Answers</h2>
            <SortTabs
              tabs={[
                { id: "top", label: "Top" },
                { id: "new", label: "New" },
              ]}
              activeId={answerSort}
              onChange={(id2) => setAnswerSort(id2 as "top" | "new")}
            />
          </div>
          {answers.length === 0 ? (
            <p className="text-sm text-[var(--ig-text-secondary)]">
              No answers yet. Be the first to respond.
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map(({ a, depth, hasChildren }) => {
                const canMark = isAsker;
                const isLoading = solutionLoadingId === a.id;
                const aCard: QaAnswerCard = {
                  _id: a.id,
                  body: a.body,
                  createdAt: a.createdAt,
                  authorLabel: a.authorLabel,
                  score: a.score ?? 0,
                  myVote: a.myVote ?? 0,
                  isAcceptedSolution: a.isAcceptedSolution,
                  depth,
                };
                const collapsedCount = collapsedChildCountByParent.get(a.id) ?? 0;
                return (
                  <li
                    key={a.id}
                    id={`answer-${a.id}`}
                    className={`rounded-xl transition-colors ${
                      highlightedAnswerId === a.id ? "ring-2 ring-[var(--ig-link)]" : ""
                    } ${a.isAcceptedSolution ? "ring-1 ring-green-600/50" : ""}`}
                  >
                    <AnswerCard
                      a={aCard}
                      showConnector
                      onVote={(v) => voteAnswer(a.id, v)}
                      onMore={() => setMoreTarget({ type: "qa_answer", id: a.id })}
                      onShare={() => shareLink(`/app/qa/${question.id}#answer-${a.id}`)}
                      onReply={() => setReplyingTo({ answerId: a.id, label: a.authorLabel })}
                    />
                    {hasChildren && collapsedCount > 0 && (
                      <div className="mt-2" style={{ marginLeft: depth * 12 }}>
                        <button
                          type="button"
                          className="qa-action-btn text-xs text-[var(--ig-text)] border border-[var(--qa-card-border)]"
                          onClick={() =>
                            setExpandedParents((prev) => {
                              const next = new Set(prev);
                              next.add(a.id);
                              return next;
                            })
                          }
                        >
                          Show {collapsedCount} repl{collapsedCount === 1 ? "y" : "ies"}
                        </button>
                      </div>
                    )}
                    {canMark && (
                      <div className="mt-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => toggleSolution(a.id, a.isAcceptedSolution)}
                          className="qa-action-btn text-xs text-[var(--ig-text)] border border-[var(--qa-card-border)]"
                        >
                          {a.isAcceptedSolution ? "Unmark solution" : "Mark as solution"}
                        </button>
                      </div>
                    )}
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

      <ReplyDrawer
        open={!!replyingTo}
        onClose={() => setReplyingTo(null)}
        questionId={question.id}
        parentAnswerId={replyingTo?.answerId ?? null}
        replyingToLabel={replyingTo?.label}
        onCreated={(created) => {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  question: { ...prev.question, answerCount: prev.question.answerCount + 1 },
                  answers: [...prev.answers, created as Answer],
                }
              : prev
          );
        }}
      />

      <MoreSheet
        open={!!moreTarget}
        onClose={() => setMoreTarget(null)}
        link={
          typeof window !== "undefined" && moreTarget
            ? `${window.location.origin}${
                moreTarget.type === "qa_question"
                  ? `/app/qa/${moreTarget.id}`
                  : `/app/qa/${question.id}#answer-${moreTarget.id}`
              }`
            : moreTarget?.type === "qa_question"
              ? `/app/qa/${moreTarget.id}`
              : `/app/qa/${question.id}#answer-${moreTarget?.id ?? ""}`
        }
        reportTargetType={(moreTarget?.type ?? "qa_question") as "qa_question" | "qa_answer"}
        reportTargetId={moreTarget?.id ?? ""}
        owner={
          moreTarget
            ? moreTarget.type === "qa_question"
              ? {
                  kind: "qa_question",
                  canEdit: Boolean(user.id && question.askedByUserId === user.id),
                  canDelete: Boolean(user.id && question.askedByUserId === user.id),
                  initialTitle: question.title,
                  initialBody: question.body,
                  onEdited: (p) => {
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            question: {
                              ...prev.question,
                              title: typeof p.title === "string" ? p.title : prev.question.title,
                              body: typeof p.body === "string" ? p.body : prev.question.body,
                            },
                          }
                        : prev
                    );
                  },
                  onDeleted: () => {
                    window.location.href = "/app/qa";
                  },
                }
              : {
                  kind: "qa_answer",
                  canEdit: Boolean(
                    user.id &&
                      data?.answers.find((a) => a.id === moreTarget.id)?.answeredByUserId === user.id
                  ),
                  canDelete: Boolean(
                    user.id &&
                      data?.answers.find((a) => a.id === moreTarget.id)?.answeredByUserId === user.id
                  ),
                  initialBody: data?.answers.find((a) => a.id === moreTarget.id)?.body ?? "",
                  onEdited: (p) => {
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            answers: prev.answers.map((a) =>
                              a.id === moreTarget.id && typeof p.body === "string"
                                ? { ...a, body: p.body }
                                : a
                            ),
                          }
                        : prev
                    );
                  },
                  onDeleted: () => {
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            question: {
                              ...prev.question,
                              answerCount: Math.max(0, prev.question.answerCount - 1),
                            },
                            answers: prev.answers.filter((a) => a.id !== moreTarget.id),
                          }
                        : prev
                    );
                  },
                }
            : undefined
        }
      />
    </div>
  );
}

