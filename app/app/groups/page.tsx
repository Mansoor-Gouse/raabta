"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type GroupItem = {
  _id: string;
  name: string;
  description?: string;
  type: string;
  channelId: string;
  memberCount: number;
  isMember: boolean;
};

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    const url = typeFilter ? `/api/groups?type=${encodeURIComponent(typeFilter)}` : "/api/groups";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setGroups(data.groups || []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [typeFilter]);

  async function handleJoin(groupId: string, channelId: string, isMember: boolean) {
    if (isMember) {
      router.push(`/app/channel/${channelId}`);
      return;
    }
    setJoiningId(groupId);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.channelId) {
        setGroups((prev) =>
          prev.map((g) =>
            g._id === groupId ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g
          )
        );
        router.push(`/app/channel/${data.channelId}`);
      }
    } finally {
      setJoiningId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading groups…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Groups</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Join interest-based or city-based groups to chat with the network.
        </p>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {["", "interest", "city", "event"].map((t) => (
            <button
              key={t || "all"}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${
                typeFilter === t ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {t || "All"}
            </button>
          ))}
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No groups yet. Create one from the API or seed data.</p>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li
                key={g._id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      {g.type}
                    </p>
                    <h2 className="font-semibold text-gray-900 dark:text-white mt-0.5">{g.name}</h2>
                    {g.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{g.description}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{g.memberCount} members</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoin(g._id, g.channelId, g.isMember)}
                    disabled={joiningId === g._id}
                    className="shrink-0 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {joiningId === g._id ? "Joining…" : g.isMember ? "Open" : "Join"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
