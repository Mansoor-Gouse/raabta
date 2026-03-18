"use client";

export function VoteRail({
  score,
  myVote,
  onVote,
  vertical = true,
  disabled = false,
}: {
  score: number;
  myVote: 1 | 0 | -1;
  onVote?: (value: 1 | 0 | -1) => void;
  vertical?: boolean;
  disabled?: boolean;
}) {
  const upActive = myVote === 1;
  const downActive = myVote === -1;

  const rail =
    "bg-[var(--qa-rail-bg)] border border-[var(--qa-rail-border)] rounded-md px-1 py-2";
  const btnBase =
    "w-9 h-9 rounded-md flex items-center justify-center transition-colors border border-transparent focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--ig-link)] disabled:opacity-50";
  const activeClass = "bg-[var(--qa-vote-active-bg)] text-[var(--qa-vote-active-text)]";
  const idleClass = "text-[var(--qa-vote-idle-text)] hover:bg-[var(--qa-vote-hover-bg)]";

  const stackClass = vertical
    ? "flex flex-col items-center gap-1"
    : "flex flex-row items-center gap-2";

  const scoreClass =
    "text-xs font-semibold text-[var(--qa-score-text)] tabular-nums min-w-[28px] text-center";

  return (
    <div className={`${rail} ${stackClass}`} aria-label="Vote">
      <button
        type="button"
        disabled={disabled || !onVote}
        onClick={() => onVote?.(upActive ? 0 : 1)}
        className={`${btnBase} ${upActive ? activeClass : idleClass}`}
        aria-label={upActive ? "Remove upvote" : "Upvote"}
        aria-pressed={upActive}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 4l8 10h-5v6H9v-6H4l8-10z" />
        </svg>
      </button>
      <div className={scoreClass}>{score}</div>
      <button
        type="button"
        disabled={disabled || !onVote}
        onClick={() => onVote?.(downActive ? 0 : -1)}
        className={`${btnBase} ${downActive ? activeClass : idleClass}`}
        aria-label={downActive ? "Remove downvote" : "Downvote"}
        aria-pressed={downActive}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 20L4 10h5V4h6v6h5l-8 10z" />
        </svg>
      </button>
    </div>
  );
}

