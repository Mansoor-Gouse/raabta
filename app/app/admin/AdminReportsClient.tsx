"use client";

import { useEffect, useState } from "react";

type Report = {
  _id: string;
  targetType: string;
  targetId: string;
  reason?: string;
  status: string;
  createdAt: string;
};

export function AdminReportsClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    fetch(`/api/reports?status=${statusFilter}&limit=50`)
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function updateStatus(reportId: string, status: string) {
    const res = await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setReports((prev) => prev.map((r) => (r._id === reportId ? { ...r, status } : r)));
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading reports…</p>;
  if (reports.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">No reports.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["pending", "reviewed", "resolved", "dismissed"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <ul className="space-y-3">
        {reports.map((r) => (
          <li
            key={r._id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {r.targetType} · {r.targetId}
                </p>
                {r.reason && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.reason}</p>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(r.createdAt).toLocaleString()} · {r.status}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {["reviewed", "resolved", "dismissed"].map(
                  (s) =>
                    r.status !== s && (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateStatus(r._id, s)}
                        className="rounded px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        {s}
                      </button>
                    )
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
