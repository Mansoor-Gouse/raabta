"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChatContext } from "stream-chat-react";

type SearchUser = {
  _id: string;
  fullName?: string;
  name?: string;
  profileImage?: string;
};

export default function NewGroupPage() {
  const router = useRouter();
  const { client } = useChatContext();
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = client?.userID ?? "";

  useEffect(() => {
    fetch("/api/me/block")
      .then((r) => r.json())
      .then((data: { blockedIds?: string[] }) => setBlockedIds(data.blockedIds ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchUsers([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetch(
        `/api/search?type=users&q=${encodeURIComponent(search.trim())}&limit=20`
      )
        .then((r) => r.json())
        .then((data: { users?: SearchUser[] }) => {
          const users = (data.users ?? []).filter(
            (u) => u._id !== currentUserId && !blockedIds.includes(u._id)
          );
          setSearchUsers(users);
        })
        .catch(() => setSearchUsers([]));
      searchDebounceRef.current = null;
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search, currentUserId, blockedIds]);

  const toggleSelected = useCallback((id: string) => {
    if (blockedIds.includes(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [blockedIds]);

  const selectedCount = selectedIds.size;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!client?.userID || selectedCount === 0) return;
    const toAdd = Array.from(selectedIds).filter((id) => !blockedIds.includes(id));
    if (toAdd.length === 0) {
      setError("Select at least one person who is not blocked.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const streamUserIds: string[] = [];
      for (const userId of toAdd) {
        const res = await fetch("/api/channels/ensure-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIdOrPhone: userId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not add a member. Try again.");
          setLoading(false);
          return;
        }
        const streamId = data.streamUserId as string;
        if (!blockedIds.includes(streamId)) streamUserIds.push(streamId);
      }
      if (streamUserIds.length === 0) {
        setError("No valid members to add.");
        setLoading(false);
        return;
      }
      const members = [client.userID, ...streamUserIds];
      const channel = client.channel("messaging", {
        name: groupName.trim() || undefined,
        members,
      });
      await channel.watch();
      router.push(`/app/channel/${channel.id}`);
    } catch (err) {
      setError("Could not create group. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg-primary)]">
      <header className="shrink-0 flex items-center gap-2 h-14 min-h-[56px] px-4 border-b border-[var(--ig-border-light)]">
        <Link
          href="/app/chats"
          className="p-2 -ml-2 rounded-lg text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
          aria-label="Back to chats"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-[var(--ig-text)]">New group</h1>
      </header>

      <form onSubmit={handleCreate} className="flex-1 flex flex-col min-h-0 p-4 max-w-md mx-auto w-full">
        <div className="space-y-4 mb-4">
          <input
            type="text"
            placeholder="Group name (optional)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] placeholder-[var(--ig-text-secondary)] min-h-[48px] text-base"
          />
          <div className="relative">
            <input
              type="text"
              placeholder="Search people"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-xl border border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] placeholder-[var(--ig-text-secondary)] min-h-[48px] text-base"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ig-text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {selectedCount > 0 && (
          <p className="text-sm text-[var(--ig-text-secondary)] mb-2">
            {selectedCount} selected
          </p>
        )}

        <ul className="flex-1 min-h-0 overflow-y-auto space-y-1 mb-4">
          {search.trim().length >= 2
            ? searchUsers.map((u) => {
                const id = u._id;
                const name = u.fullName ?? u.name ?? id;
                const isBlocked = blockedIds.includes(id);
                const selected = selectedIds.has(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggleSelected(id)}
                      disabled={isBlocked}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isBlocked
                          ? "opacity-50 cursor-not-allowed"
                          : selected
                            ? "bg-[var(--ig-border-light)]"
                            : "hover:bg-[var(--ig-border-light)]/50"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center shrink-0 overflow-hidden">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-[var(--ig-text-secondary)]">
                            {(name || "?")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="flex-1 min-w-0 truncate text-[var(--ig-text)] font-medium">
                        {name}
                      </span>
                      {selected && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--ig-text)] flex items-center justify-center text-[var(--ig-bg-primary)] text-xs">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            : (
              <p className="text-sm text-[var(--ig-text-secondary)] py-4">
                Type at least 2 characters to search for people to add.
              </p>
            )}
        </ul>

        {error && (
          <p className="text-sm text-[var(--ig-error)] mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || selectedCount === 0}
          className="w-full px-4 py-3 rounded-xl bg-[var(--ig-text)] text-[var(--ig-bg-primary)] font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
        >
          {loading ? "Creating…" : `Create group${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
        </button>
      </form>
    </div>
  );
}
