"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatContext } from "stream-chat-react";

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client } = useChatContext();
  const userIdParam = searchParams.get("userId") ?? "";
  const [memberId, setMemberId] = useState(userIdParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    if (userIdParam) setMemberId(userIdParam);
  }, [userIdParam]);

  useEffect(() => {
    fetch("/api/me/block")
      .then((r) => r.json())
      .then((data: { blockedIds?: string[] }) => setBlockedIds(data.blockedIds ?? []))
      .catch(() => {});
  }, []);

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

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-md mx-auto w-full bg-[var(--ig-bg-primary)]">
      <h2 className="text-lg font-semibold mb-4 text-[var(--ig-text)]">New chat</h2>
      <form onSubmit={handleCreate} className="space-y-4">
        <input
          type="text"
          placeholder="User ID or phone number"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] placeholder-[var(--ig-text-secondary)] min-h-[48px] text-base"
        />
        {error && (
          <p className="text-sm text-[var(--ig-error)]">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl bg-[var(--ig-text)] text-[var(--ig-bg-primary)] font-medium disabled:opacity-50 min-h-[48px] touch-manipulation"
        >
          {loading ? "Creating…" : "Start chat"}
        </button>
      </form>
    </div>
  );
}
