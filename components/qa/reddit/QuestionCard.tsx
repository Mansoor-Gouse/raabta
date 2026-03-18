"use client";

import Link from "next/link";
import { VoteRail } from "./VoteRail";
import { IconBookmark, IconComment, IconMore, IconShare } from "@/components/layout/InstagramIcons";

export type QaQuestionCard = {
  _id: string;
  title: string;
  body: string;
  topics?: string[];
  contextLabel?: string | null;
  answerCount: number;
  followerCount?: number;
  createdAt: string;
  authorLabel?: string;
  score?: number;
  myVote?: 1 | 0 | -1;
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

export function QuestionCard({
  q,
  compact = false,
  onVote,
  voteDisabled,
  onShare,
  onSave,
  saved,
  onMore,
}: {
  q: QaQuestionCard;
  compact?: boolean;
  onVote?: (value: 1 | 0 | -1) => void;
  voteDisabled?: boolean;
  onShare?: () => void;
  onSave?: () => void;
  saved?: boolean;
  onMore?: () => void;
}) {
  const metaBits: string[] = [];
  if (q.contextLabel) metaBits.push(q.contextLabel);
  if (q.topics?.length) metaBits.push(q.topics.slice(0, 2).join(" · "));
  if (q.authorLabel) metaBits.push(q.authorLabel);
  metaBits.push(formatTime(q.createdAt));

  return (
    <div className="qa-card flex gap-3">
      <div className="pt-1">
        <VoteRail
          score={q.score ?? 0}
          myVote={q.myVote ?? 0}
          onVote={onVote}
          disabled={!!voteDisabled}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-[var(--qa-meta)] flex flex-wrap gap-x-2 gap-y-1">
          {metaBits.map((b, i) => (
            <span key={`${b}-${i}`}>{b}</span>
          ))}
        </div>

        <Link href={`/app/qa/${q._id}`} className="block mt-1">
          <div className="text-[15px] font-extrabold leading-snug text-[var(--qa-title)]">
            {q.title}
          </div>
          {!!q.body && (
            <div
              className={`mt-1 text-[13px] leading-relaxed text-[var(--qa-body)] ${
                compact ? "line-clamp-2" : "line-clamp-6"
              }`}
            >
              {q.body}
            </div>
          )}
        </Link>

        <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-[var(--qa-action)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="qa-action-btn"
              onClick={() => {}}
              aria-label="Answers"
            >
              <span className="inline-flex items-center gap-1.5">
                <IconComment className="w-4 h-4" />
                <span className="font-semibold tabular-nums">{q.answerCount}</span>
                <span>Answers</span>
              </span>
            </button>
            <button type="button" className="qa-action-btn" onClick={onShare}>
              <span className="inline-flex items-center gap-1.5">
                <IconShare className="w-4 h-4" />
                <span>Share</span>
              </span>
            </button>
            <button type="button" className="qa-action-btn" onClick={onSave}>
              <span className="inline-flex items-center gap-1.5">
                <IconBookmark className="w-4 h-4" filled={!!saved} />
                <span>{saved ? "Saved" : "Save"}</span>
              </span>
            </button>
          </div>
          <button
            type="button"
            className="qa-action-btn"
            onClick={onMore}
            aria-label="More"
          >
            <IconMore className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

