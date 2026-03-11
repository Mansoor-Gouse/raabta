"use client";

import { useChannelStateContext, useChatContext } from "stream-chat-react";

type Member = {
  user_id?: string;
  user?: { id?: string; name?: string; image?: string };
};

export function GroupMembersSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const currentUserId = client?.userID ?? "";

  const members = (channel?.state?.members ?? {}) as Record<string, Member>;
  const memberList = Object.entries(members).map(([id, m]) => ({
    id: m.user_id ?? id,
    name: (m.user as { name?: string })?.name ?? (m.user as { id?: string })?.id ?? id,
    image: (m.user as { image?: string })?.image,
  }));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center md:bg-black/40"
      role="dialog"
      aria-label="Group members"
    >
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative flex flex-col bg-[var(--ig-bg-primary)] rounded-t-2xl md:rounded-xl md:max-w-sm w-full max-h-[70vh] md:max-h-[400px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--ig-border)]">
          <h2 className="text-lg font-semibold text-[var(--ig-text)]">
            Group members
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {memberList.length === 0 ? (
            <p className="text-sm text-[var(--ig-text-secondary)] py-4 text-center">
              Loading members…
            </p>
          ) : (
            <ul className="space-y-0.5">
              {memberList.map((m) => {
                const isYou = m.id === currentUserId;
                const displayName = m.name || m.id || "Unknown";
                const initial = (displayName || "?")[0].toUpperCase();
                return (
                  <li key={m.id}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--ig-border-light)]">
                      <div className="w-10 h-10 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center shrink-0 overflow-hidden">
                        {m.image ? (
                          <img src={m.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-[var(--ig-text-secondary)]">
                            {initial}
                          </span>
                        )}
                      </div>
                      <span className="flex-1 min-w-0 truncate text-[var(--ig-text)] font-medium">
                        {displayName}
                      </span>
                      {isYou && (
                        <span className="text-xs font-medium text-[var(--ig-text-secondary)] shrink-0">
                          You
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
