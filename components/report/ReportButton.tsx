"use client";

import { useState } from "react";

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "post" | "event" | "user";
  targetId: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReport() {
    if (loading || submitted) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason: "Reported from UI" }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) return <span className="text-xs text-gray-500 dark:text-gray-400">Reported</span>;
  return (
    <button
      type="button"
      onClick={handleReport}
      disabled={loading}
      className="text-sm text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50"
    >
      {loading ? "Reporting…" : "Report"}
    </button>
  );
}
