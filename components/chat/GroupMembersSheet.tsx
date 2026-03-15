"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";

type Member = {
  user_id?: string;
  user?: { id?: string; name?: string; image?: string };
};

type SearchUser = { _id: string; fullName?: string; name?: string; profileImage?: string };

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
  const [addMode, setAddMode] = useState(false);
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  const members = (channel?.state?.members ?? {}) as Record<string, Member>;
  const existingIdsSet = new Set(Object.keys(members).map((k) => (members[k].user_id ?? k)));
  const existingIdsStr = Object.keys(members).sort().join(",");
  const memberList = Object.entries(members).map(([id, m]) => ({
    id: m.user_id ?? id,
    name: (m.user as { name?: string })?.name ?? (m.user as { id?: string })?.id ?? id,
    image: (m.user as { image?: string })?.image,
  }));

  useEffect(() => {
    fetch("/api/me/block")
      .then((r) => r.json())
      .then((data: { blockedIds?: string[] }) => setBlockedIds(data.blockedIds ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!addMode || !search.trim() || search.length < 2) {
      setSearchUsers([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetch(`/api/search?type=users&q=${encodeURIComponent(search.trim())}&limit=20`)
        .then((r) => r.json())
        .then((data: { users?: SearchUser[] }) => {
          const users = (data.users ?? []).filter(
            (u) =>
              u._id !== currentUserId &&
              !blockedIds.includes(u._id) &&
              !existingIdsSet.has(u._id)
          );
          setSearchUsers(users);
        })
        .catch(() => setSearchUsers([]));
      searchDebounceRef.current = null;
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [addMode, search, currentUserId, blockedIds, existingIdsStr]);

  const toggleSelectedToAdd = useCallback((id: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function handleAddMembers() {
    if (!channel || selectedToAdd.size === 0) return;
    setAdding(true);
    try {
      const streamUserIds: string[] = [];
      for (const userId of selectedToAdd) {
        const res = await fetch("/api/channels/ensure-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIdOrPhone: userId }),
        });
        const data = await res.json();
        if (res.ok && data.streamUserId) streamUserIds.push(data.streamUserId);
      }
      if (streamUserIds.length > 0) {
        await channel.addMembers(streamUserIds);
        setSelectedToAdd(new Set());
        setSearch("");
        setAddMode(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!channel || memberId === currentUserId) return;
    if (!window.confirm("Remove this member from the group?")) return;
    setRemovingId(memberId);
    try {
      await channel.removeMembers([memberId]);
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center md:bg-black/40"
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        className="relative flex flex-col bg-[var(--ig-bg-primary)] rounded-t-2xl md:rounded-xl md:max-w-sm w-full max-h-[70vh] md:max-h-[400px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--ig-border)]">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--ig-text)]">Group members</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)]"
            aria-label="Close group members"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {addMode ? (
            <div className="space-y-3">
              <input
                type="search"
                placeholder="Search to add..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] placeholder:text-[var(--ig-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)]"
                aria-label="Search users to add"
              />
              <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                {searchUsers.map((u) => {
                  const name = u.fullName || u.name || u._id;
                  const initial = (name || "?")[0].toUpperCase();
                  const selected = selectedToAdd.has(u._id);
                  return (
                    <li key={u._id}>
                      <button
                        type="button"
                        onClick={() => toggleSelectedToAdd(u._id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--ig-border-light)] text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center shrink-0 overflow-hidden">
                          {u.profileImage ? (
                            <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-[var(--ig-text-secondary)]">{initial}</span>
                          )}
                        </div>
                        <span className="flex-1 min-w-0 truncate text-[var(--ig-text)]">{name}</span>
                        {selected && <span className="text-[var(--ig-text)] shrink-0">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAddMode(false); setSearch(""); setSelectedToAdd(new Set()); }}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--ig-border)] text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMembers}
                  disabled={selectedToAdd.size === 0 || adding}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--ig-text)] text-[var(--ig-bg-primary)] font-medium disabled:opacity-50"
                >
                  {adding ? "Adding…" : `Add ${selectedToAdd.size || ""}`}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAddMode(true)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] mb-1"
              >
                Add members
              </button>
              {memberList.length === 0 ? (
                <p className="text-sm text-[var(--ig-text-secondary)] py-4 text-center">Loading members…</p>
              ) : (
                <ul className="space-y-0.5">
                  {memberList.map((m) => {
                    const isYou = m.id === currentUserId;
                    const displayName = m.name || m.id || "Unknown";
                    const initial = (displayName || "?")[0].toUpperCase();
                    const isRemoving = removingId === m.id;
                    return (
                      <li key={m.id}>
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--ig-border-light)]">
                          <div className="w-10 h-10 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center shrink-0 overflow-hidden">
                            {m.image ? (
                              <img src={m.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-medium text-[var(--ig-text-secondary)]">{initial}</span>
                            )}
                          </div>
                          <span className="flex-1 min-w-0 truncate text-[var(--ig-text)] font-medium">
                            {displayName}
                          </span>
                          {isYou && (
                            <span className="text-xs font-medium text-[var(--ig-text-secondary)] shrink-0">You</span>
                          )}
                          {!isYou && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              disabled={isRemoving}
                              className="text-xs font-medium text-[var(--ig-error)] hover:underline disabled:opacity-50"
                              aria-label={`Remove ${displayName}`}
                            >
                              {isRemoving ? "…" : "Remove"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
