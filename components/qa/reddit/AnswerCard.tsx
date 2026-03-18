"use client";

import { IconComment, IconMore, IconShare } from "@/components/layout/InstagramIcons";

export type QaAnswerCard = {
  _id: string;
  body: string;
  createdAt: string;
  authorLabel?: string;
  score?: number;
  myVote?: 1 | 0 | -1;
  isAcceptedSolution?: boolean;
  depth?: number;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

function initials(label?: string) {
  const s = (label ?? "Member").replace(/^u\//, "").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "M").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  return `${a}${b}`;
}

function IconUp({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 4l8 10h-5v6H9v-6H4l8-10z" />
    </svg>
  );
}

function IconDown({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 20L4 10h5V4h6v6h5l-8 10z" />
    </svg>
  );
}

export function AnswerCard({
  a,
  onVote,
  voteDisabled,
  onReply,
  onShare,
  onMore,
  showConnector = false,
}: {
  a: QaAnswerCard;
  onVote?: (value: 1 | 0 | -1) => void;
  voteDisabled?: boolean;
  onReply?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  showConnector?: boolean;
}) {
  const depth = Math.min(6, Math.max(0, a.depth ?? 0));
  const upActive = (a.myVote ?? 0) === 1;
  const downActive = (a.myVote ?? 0) === -1;

  return (
    <div className="relative" style={{ marginLeft: depth * 14 }}>
      {showConnector && depth > 0 && (
        <div
          className="absolute -top-3 -bottom-3 left-3 w-px bg-[var(--qa-connector)]"
          aria-hidden
        />
      )}

      <div className="flex gap-3 py-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 border border-[var(--qa-card-border)] flex items-center justify-center text-[11px] font-bold text-[var(--ig-text-secondary)]">
            {initials(a.authorLabel)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[12px] font-semibold text-[var(--ig-text)]">
              {a.authorLabel ?? "Member"}
            </div>
            <div className="text-[12px] text-[var(--qa-meta)]">{formatTime(a.createdAt)}</div>
            {a.isAcceptedSolution && (
              <div className="text-[11px] font-bold text-[var(--qa-solution)]">Solution</div>
            )}
          </div>

          <div className="mt-1.5 text-[14px] leading-relaxed text-[var(--ig-text)] whitespace-pre-wrap">
            {a.body}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-[var(--qa-action)]">
            <div className="flex items-center gap-1">
              <button type="button" className="qa-action-btn" onClick={onReply}>
                <span className="inline-flex items-center gap-1.5">
                  <IconComment className="w-4 h-4" />
                  <span>Reply</span>
                </span>
              </button>
              <button type="button" className="qa-action-btn" onClick={onShare}>
                <span className="inline-flex items-center gap-1.5">
                  <IconShare className="w-4 h-4" />
                  <span>Share</span>
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`qa-action-btn ${upActive ? "text-[var(--ig-text)]" : ""}`}
                onClick={() => onVote?.(upActive ? 0 : 1)}
                disabled={voteDisabled || !onVote}
                aria-label={upActive ? "Remove upvote" : "Upvote"}
              >
                <IconUp className="w-5 h-5" />
              </button>
              <div className="text-[12px] font-semibold tabular-nums text-[var(--ig-text)] min-w-[28px] text-center">
                {a.score ?? 0}
              </div>
              <button
                type="button"
                className={`qa-action-btn ${downActive ? "text-[var(--ig-text)]" : ""}`}
                onClick={() => onVote?.(downActive ? 0 : -1)}
                disabled={voteDisabled || !onVote}
                aria-label={downActive ? "Remove downvote" : "Downvote"}
              >
                <IconDown className="w-5 h-5" />
              </button>
              <button type="button" className="qa-action-btn" onClick={onMore} aria-label="More">
                <IconMore className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px bg-[var(--ig-border-light)]" />
    </div>
  );
}

