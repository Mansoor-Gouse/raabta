"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

type SearchResults = {
  users: { _id: string; fullName?: string; name?: string; profileImage?: string; headline?: string; location?: string }[];
  events: { _id: string; title: string; location?: string; startAt: string; type: string }[];
  posts: { _id: string; caption?: string; mediaUrls: string[]; authorName?: string; createdAt: string }[];
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "users" | "events" | "posts">("all");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const typeParam = activeTab === "all" ? "" : `&type=${activeTab}`;
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}${typeParam}&limit=20`);
      const data = await res.json();
      setResults({
        users: data.users ?? [],
        events: data.events ?? [],
        posts: data.posts ?? [],
      });
    } catch {
      setResults({ users: [], events: [], posts: [] });
    } finally {
      setLoading(false);
    }
  }, [query, activeTab]);

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <div className="max-w-lg mx-auto px-4 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Search</h1>
        <div className="flex gap-2 mb-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search people, events, posts..."
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Search
          </button>
        </div>
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
          {(["all", "users", "events", "posts"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400"
              }`}
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Searching…</p>}
        {results && !loading && (
          <div className="space-y-6">
            {(activeTab === "all" || activeTab === "users") && results.users.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">People</h2>
                <ul className="space-y-2">
                  {results.users.map((u) => (
                    <li key={u._id}>
                      <Link
                        href={`/app/members/${u._id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                          {u.profileImage ? (
                            <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm text-gray-500">{u.fullName || u.name?.charAt(0) || "?"}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{u.fullName || u.name || "Member"}</p>
                          {u.headline && <p className="text-xs text-gray-500 dark:text-gray-400">{u.headline}</p>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {(activeTab === "all" || activeTab === "events") && results.events.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Events</h2>
                <ul className="space-y-2">
                  {results.events.map((e) => (
                    <li key={e._id}>
                      <Link
                        href={`/app/events/${e._id}`}
                        className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{e.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(e.startAt).toLocaleDateString()} {e.location && `· ${e.location}`}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {(activeTab === "all" || activeTab === "posts") && results.posts.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Posts</h2>
                <ul className="space-y-2">
                  {results.posts.map((p) => (
                    <li key={p._id}>
                      <Link
                        href={`/app/feed/${p._id}`}
                        className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">{p.caption || "Post"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.authorName}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {!loading && results && results.users.length === 0 && results.events.length === 0 && results.posts.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No results found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
