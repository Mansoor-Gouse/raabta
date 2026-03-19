"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatContext } from "stream-chat-react";

type SearchUser = {
  _id: string;
  fullName?: string;
  name?: string;
  profileImage?: string;
};

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client } = useChatContext();
  const userIdParam = searchParams.get("userId") ?? "";
  const [memberId, setMemberId] = useState(userIdParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [blockedLoaded, setBlockedLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentUsers, setRecentUsers] = useState<SearchUser[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autoCreateDone = useRef(false);

  useEffect(() => {
    if (userIdParam) setMemberId(userIdParam);
  }, [userIdParam]);

  useEffect(() => {
    fetch("/api/me/block")
      .then((r) => r.json())
      .then((data: { blockedIds?: string[] }) => {
        setBlockedIds(data.blockedIds ?? []);
        setBlockedLoaded(true);
      })
      .catch(() => setBlockedLoaded(true));
  }, []);

  // Load recent 1:1 chat partners from Stream channels
  useEffect(() => {
    if (!client?.userID || !blockedLoaded) return;
    const loadRecent = async () => {
      try {
        const channels = await client.queryChannels(
          { type: "messaging", member_count: 2 },
          [{ last_message_at: -1 }],
          { limit: 20 }
        );
        const others: SearchUser[] = [];
        for (const ch of channels) {
          const members = ch.state?.members ?? {};
          const otherId = Object.keys(members).find((id) => id !== client.userID);
          if (!otherId) continue;

          const member = members[otherId] as {
            user?: { id?: string; name?: string; image?: string };
          };
          const user = member?.user;
          const candidateId = user?.id ?? otherId;
          if (!candidateId) continue;

          // Keep blocked users out of the "recent" list for consistency.
          if (blockedIds.includes(candidateId)) continue;

          if (user && !others.some((o) => o._id === user.id)) {
            others.push({
              _id: candidateId,
              name: user.name,
              profileImage: user.image,
            });
          }
        }
        setRecentUsers(others);
      } catch {
        setRecentUsers([]);
      }
    };
    loadRecent();
  }, [client?.userID, blockedLoaded, blockedIds]);

  // Debounced user search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      fetch(`/api/search?type=users&q=${encodeURIComponent(q)}&limit=20`, { credentials: "include" })
        .then((r) => r.json())
        .then((data: { users?: SearchUser[] }) => {
          const current = client?.userID ?? "";
          const users = (data.users ?? []).filter(
            (u) => u._id !== current && !blockedIds.includes(u._id)
          );
          setSearchResults(users);
        })
        .catch(() => setSearchResults([]))
        .finally(() => {
          setSearching(false);
          searchDebounceRef.current = null;
        });
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, client?.userID, blockedIds]);

  // Auto-create chat when opening with ?userId=
  useEffect(() => {
    if (!userIdParam.trim() || !client?.userID || !blockedLoaded || autoCreateDone.current) return;
    const idToCheck = userIdParam.trim();
    if (blockedIds.includes(idToCheck)) {
      setError("You have blocked this user. Unblock in Settings to start a chat.");
      return;
    }
    autoCreateDone.current = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await fetch("/api/channels/ensure-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIdOrPhone: idToCheck }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not start chat.");
          setLoading(false);
          return;
        }
        const otherUserId = data.streamUserId as string;
        if (blockedIds.includes(otherUserId)) {
          setError("You have blocked this user. Unblock in Settings to start a chat.");
          setLoading(false);
          return;
        }
        const channel = client.channel("messaging", {
          members: [client.userID, otherUserId],
        });
        await channel.watch();
        router.push(`/app/channel/${channel.id}`);
      } catch {
        setError("Could not create chat. Check the user ID or phone number.");
        setLoading(false);
      }
    })();
  }, [userIdParam, client, blockedLoaded, blockedIds, router]);

  const startChatWithUser = useCallback(
    async (user: SearchUser) => {
      if (!client?.userID) return;
      if (blockedIds.includes(user._id)) {
        setError("You have blocked this user. Unblock in Settings to start a chat.");
        return;
      }
      setError("");
      setLoading(true);
      setDropdownOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      try {
        const res = await fetch("/api/channels/ensure-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIdOrPhone: user._id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not start chat.");
          setLoading(false);
          return;
        }
        const otherUserId = data.streamUserId as string;
        if (blockedIds.includes(otherUserId)) {
          setError("You have blocked this user. Unblock in Settings to start a chat.");
          setLoading(false);
          return;
        }
        const channel = client.channel("messaging", {
          members: [client.userID, otherUserId],
        });
        await channel.watch();
        router.push(`/app/channel/${channel.id}`);
      } catch {
        setError("Could not create chat. Try again.");
        setLoading(false);
      }
    },
    [client, blockedIds, router]
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!client?.userID || !memberId.trim()) return;
    const idToCheck = memberId.trim();
    if (blockedIds.includes(idToCheck)) {
      setError("You have blocked this user. Unblock in Settings to start a chat.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/channels/ensure-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIdOrPhone: memberId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start chat.");
        return;
      }
      const otherUserId = data.streamUserId as string;
      if (blockedIds.includes(otherUserId)) {
        setError("You have blocked this user. Unblock in Settings to start a chat.");
        setLoading(false);
        return;
      }
      const channel = client.channel("messaging", {
        members: [client.userID, otherUserId],
      });
      await channel.watch();
      router.push(`/app/channel/${channel.id}`);
    } catch (err) {
      setError("Could not create chat. Check the user ID or phone number.");
    } finally {
      setLoading(false);
    }
  }

  const isAutoCreating = userIdParam.trim() && loading;
  const displayResults = searchQuery.trim().length >= 2 ? searchResults : [];
  const showDropdown = dropdownOpen && (displayResults.length > 0 || searching);

  if (isAutoCreating) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-[var(--ig-bg-primary)]">
        <p className="text-[var(--ig-text-secondary)]">Opening chat…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg-primary)]">
      <header className="shrink-0 flex items-center gap-2 h-14 min-h-[56px] px-4 border-b border-[var(--ig-border-light)]" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
        <Link
          href="/app/chats"
          className="p-2 -ml-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
          aria-label="Back to chats"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-[var(--ig-text)]">New chat</h1>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-md mx-auto w-full">
        {/* Search with dropdown */}
        <div className="relative mb-6" ref={dropdownRef}>
          <div className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[var(--ig-border-light)] text-[var(--ig-text)] border border-transparent focus-within:border-[var(--ig-border)]">
            <svg className="w-5 h-5 shrink-0 text-[var(--ig-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search by name to start a chat"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
              className="flex-1 min-w-0 bg-transparent text-[var(--ig-text)] placeholder-[var(--ig-text-secondary)] border-0 focus:outline-none focus:ring-0 text-base"
              aria-label="Search users"
              aria-expanded={showDropdown}
              aria-autocomplete="list"
            />
            {searching && (
              <span className="w-5 h-5 rounded-full border-2 border-[var(--ig-text-secondary)] border-t-transparent animate-spin shrink-0" aria-hidden />
            )}
          </div>
          {showDropdown && (
            <div
              className="absolute left-0 right-0 top-full mt-1 py-1 rounded-xl bg-[var(--ig-bg-primary)] border border-[var(--ig-border)] shadow-lg max-h-[280px] overflow-y-auto z-10"
              role="listbox"
              aria-label="Search results"
            >
              {searching ? (
                <div className="px-4 py-6 text-center text-sm text-[var(--ig-text-secondary)]">Searching…</div>
              ) : displayResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[var(--ig-text-secondary)]">No users found</div>
              ) : (
                displayResults.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    role="option"
                    onClick={() => startChatWithUser(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--ig-border-light)] focus:bg-[var(--ig-border-light)] focus:outline-none"
                  >
                    {u.profileImage ? (
                      <img src={u.profileImage} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--ig-border)] flex items-center justify-center text-[var(--ig-text-secondary)] font-medium shrink-0">
                        {(u.fullName || u.name || u._id).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-[var(--ig-text)] truncate">{u.fullName || u.name || u._id}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Recent chats section */}
        {recentUsers.length > 0 && searchQuery.trim().length < 2 && (
          <section className="mb-6" aria-label="Recent chats">
            <h2 className="text-sm font-semibold text-[var(--ig-text-secondary)] uppercase tracking-wide mb-3">Recent</h2>
            <ul className="space-y-0">
              {recentUsers.slice(0, 10).map((u) => (
                <li key={u._id}>
                  <button
                    type="button"
                    onClick={() => startChatWithUser(u)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-[var(--ig-border-light)] focus:bg-[var(--ig-border-light)] focus:outline-none disabled:opacity-50 text-left"
                  >
                    {u.profileImage ? (
                      <img src={u.profileImage} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[var(--ig-border)] flex items-center justify-center text-[var(--ig-text-secondary)] font-medium shrink-0 text-lg">
                        {(u.name || u._id).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-[var(--ig-text)] truncate">{u.fullName || u.name || u._id}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Divider and manual entry */}
        <div className="pt-4 border-t border-[var(--ig-border-light)]">
          <p className="text-sm text-[var(--ig-text-secondary)] mb-3">Or start with user ID or phone number</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              placeholder="User ID or phone number"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] placeholder-[var(--ig-text-secondary)] min-h-[48px] text-base"
            />
            {error && <p className="text-sm text-[var(--ig-error)]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-[var(--ig-text)] text-[var(--ig-bg-primary)] font-medium disabled:opacity-50 min-h-[48px] touch-manipulation"
            >
              {loading ? "Creating…" : "Start chat"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
