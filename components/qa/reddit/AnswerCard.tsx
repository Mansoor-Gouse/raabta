"use client";

import { VoteRail } from "./VoteRail";

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

  return (
    <div className="relative">
      {showConnector && depth > 0 && (
        <div
          className="absolute top-0 bottom-0 left-2 w-px bg-[var(--qa-connector)]"
          style={{ marginLeft: depth * 12 }}
          aria-hidden
        />
      )}

      <div className="qa-card flex gap-3" style={{ marginLeft: depth * 12 }}>
        <div className="pt-1">
          <VoteRail
            score={a.score ?? 0}
            myVote={a.myVote ?? 0}
            onVote={onVote}
            disabled={!!voteDisabled}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold text-[var(--qa-meta)]">
              {a.authorLabel ?? "Member"} · {formatTime(a.createdAt)}
            </div>
            {a.isAcceptedSolution && (
              <div className="text-[11px] font-bold text-[var(--qa-solution)]">
                Solution
              </div>
            )}
          </div>

          <div className="mt-2 text-[13px] leading-relaxed text-[var(--qa-body)] whitespace-pre-wrap">
            {a.body}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-[var(--qa-action)]">
            <div className="flex items-center gap-2">
              <button type="button" className="qa-action-btn" onClick={onReply}>
                Reply
              </button>
              <button type="button" className="qa-action-btn" onClick={onShare}>
                Share
              </button>
            </div>
            <button
              type="button"
              className="qa-action-btn"
              onClick={onMore}
              aria-label="More"
            >
              ⋯
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

