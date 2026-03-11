"use client";

import { useEffect, useState } from "react";

export function BlockedList() {
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/block")
      .then((r) => r.json())
      .then((data: { blockedIds?: string[] }) => setBlockedIds(data.blockedIds ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleUnblock(userId: string) {
    const res = await fetch("/api/me/block/" + encodeURIComponent(userId), { method: "DELETE" });
    if (res.ok) setBlockedIds((prev) => prev.filter((id) => id !== userId));
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <section className="mb-6">
      <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Blocked users</h3>
      {blockedIds.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No blocked users.</p>
      ) : (
        <ul className="space-y-2">
          {blockedIds.map((id) => (
            <li
              key={id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{id}</span>
              <button
                type="button"
                onClick={() => handleUnblock(id)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
