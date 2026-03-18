"use client";

import { useState } from "react";
import { IconShare } from "@/components/layout/InstagramIcons";

type AskQuestionDrawerProps = {
  open: boolean;
  onClose: () => void;
  contextType?: string;
  contextId?: string;
  defaultTitle?: string;
};

function IconClose({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconLink({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 4.93" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 7.07 7.07L14 19.07" />
    </svg>
  );
}

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
      <div className="fixed inset-0 z-50 bg-[var(--ig-bg-primary)]" role="dialog" aria-modal="true" aria-label="Ask a question">
        <header className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]">
          <button type="button" onClick={onClose} className="p-2 -m-2 text-[var(--ig-text)]" aria-label="Close">
            <IconClose />
          </button>
          <div className="text-sm font-semibold text-[var(--ig-text)]">Ask</div>
          <button
            type="button"
            onClick={(e) => void handleSubmit(e as unknown as React.FormEvent)}
            disabled={submitting || !title.trim()}
            className="text-sm font-semibold text-[var(--ig-link)] disabled:opacity-40"
          >
            Post
          </button>
        </header>

        <div className="px-4 pt-3">
          {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder="Title"
            className="mt-2 w-full bg-transparent text-[15px] text-[var(--ig-text)] outline-none"
          />
          <div className="mt-3 h-px bg-[var(--ig-border-light)]" />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={4000}
            placeholder="Body (optional)"
            className="mt-3 w-full min-h-[45vh] bg-transparent text-[15px] text-[var(--ig-text)] outline-none resize-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
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
                      : "bg-transparent text-[var(--ig-text)] border-[var(--ig-border)]"
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        <footer className="fixed inset-x-0 bottom-0 z-10 px-4 py-3 border-t border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)] flex items-center justify-between">
          <button type="button" className="p-2 -m-2 text-[var(--ig-text-secondary)]" aria-label="Attach link">
            <IconLink />
          </button>
          <label className="flex items-center gap-2 text-xs text-[var(--ig-text-secondary)]">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            Discreet
          </label>
          <button type="button" className="p-2 -m-2 text-[var(--ig-text-secondary)]" aria-label="Share">
            <IconShare className="w-5 h-5" />
          </button>
        </footer>
      </div>
    </>
  );
}

