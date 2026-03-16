"use client";

import { useState } from "react";

type AskQuestionDrawerProps = {
  open: boolean;
  onClose: () => void;
  contextType?: string;
  contextId?: string;
  defaultTitle?: string;
};

const TOPIC_OPTIONS = [
  "Career",
  "Business",
  "Family",
  "Deen",
  "Travel",
  "Community",
  "Philanthropy",
  "Relocation",
];

export function AskQuestionDrawer({
  open,
  onClose,
  contextType,
  contextId,
  defaultTitle,
}: AskQuestionDrawerProps) {
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [details, setDetails] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/qa/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: trimmedTitle,
          details: details.trim(),
          topics,
          city: city.trim() || undefined,
          isAnonymousToMembers: isAnonymous,
          contextType,
          contextId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong.");
      } else {
        setTitle("");
        setDetails("");
        setTopics([]);
        setCity("");
        setIsAnonymous(false);
        onClose();
        if (data?.id && typeof window !== "undefined") {
          window.location.href = `/app/qa/${data.id}`;
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[88vh] rounded-t-2xl bg-[var(--ig-bg-primary)] border-t border-[var(--ig-border-light)] shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-label="Ask a question"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--ig-border-light)]">
          <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
            <div className="w-9 h-1 rounded-full bg-[var(--ig-border)] cursor-grab active:cursor-grabbing" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--ig-text)] px-4 pb-3">
            Ask about this
          </h2>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4 space-y-4"
        >
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--ig-text-secondary)]">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="What would you like to ask?"
              className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--ig-text-secondary)]">
              Details <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="Share enough context for members to give a thoughtful answer."
              className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] resize-y"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--ig-text-secondary)]">
              Topics <span className="font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TOPIC_OPTIONS.map((topic) => {
                const active = topics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      active
                        ? "bg-[var(--ig-text)] text-[var(--ig-bg-primary)] border-[var(--ig-text)]"
                        : "bg-[var(--ig-border-light)] text-[var(--ig-text)] border-[var(--ig-border)]"
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--ig-text-secondary)]">
              City <span className="font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Dubai, London, Riyadh"
              className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)]"
            />
          </div>
          <div className="space-y-2 border-t border-[var(--ig-border-light)] pt-3">
            <label className="flex items-start gap-2 text-xs text-[var(--ig-text)]">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Ask discreetly
                <span className="block text-[10px] text-[var(--ig-text-secondary)]">
                  Members will see this as asked by “a member”. Moderators can still see your identity
                  to keep the community safe.
                </span>
              </span>
            </label>
          </div>
          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Posting…" : "Post question"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

