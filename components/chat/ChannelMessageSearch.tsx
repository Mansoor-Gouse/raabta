"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageResponse } from "stream-chat";
import { useChannelActionContext, useChannelStateContext } from "stream-chat-react";

type SearchResult = { message: MessageResponse };

/**
 * In-channel message search overlay. Search entry point and results;
 * on select, jumps to message and closes.
 */
export function ChannelMessageSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { channel } = useChannelStateContext();
  const { jumpToMessage } = useChannelActionContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!channel || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await channel.search(q, { limit: 20 });
      const list = (res?.results ?? []) as SearchResult[];
      setResults(list.filter((r) => r.message?.id));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [channel, query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    setQuery("");
    setResults([]);
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [open, query, runSearch]);

  const handleSelect = useCallback(
    (messageId: string) => {
      jumpToMessage(messageId);
      onClose();
    },
    [jumpToMessage, onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/40 md:bg-transparent md:relative md:inset-auto md:flex-1 md:max-w-sm"
      role="dialog"
      aria-label="Search in conversation"
    >
      <div
        className="absolute inset-0 md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex flex-col bg-[var(--ig-bg-primary)] border-b md:border border-[var(--ig-border)] rounded-t-xl md:rounded-lg shadow-lg max-h-[70vh] md:max-h-[400px] min-h-0">
        <div className="flex items-center gap-2 p-2 border-b border-[var(--ig-border)] shrink-0">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] text-sm placeholder-[var(--ig-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)]"
            aria-label="Search messages"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
            aria-label="Close search"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-2">
          {loading && (
            <p className="text-sm text-[var(--ig-text-secondary)] py-2">
              Searching…
            </p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-[var(--ig-text-secondary)] py-2">
              No messages found.
            </p>
          )}
          {!loading &&
            results.map(({ message }) => {
              const id = (message as { id?: string })?.id;
              const text = (message as { text?: string })?.text ?? "";
              const user = (message as { user?: { name?: string; id?: string } })?.user;
              const name = user?.name || user?.id || "Unknown";
              const created = (message as { created_at?: string })?.created_at;
              const dateStr = created
                ? new Date(created).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: created ? undefined : undefined,
                  })
                : "";
              if (!id) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelect(id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--ig-border-light)] text-sm"
                >
                  <p className="font-medium text-[var(--ig-text)] truncate">
                    {name}
                  </p>
                  <p className="text-[var(--ig-text-secondary)] truncate">
                    {text.slice(0, 80)}
                    {text.length > 80 ? "…" : ""}
                  </p>
                  {dateStr && (
                    <p className="text-xs text-[var(--ig-text-tertiary)] mt-0.5">
                      {dateStr}
                    </p>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
