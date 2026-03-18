"use client";

import { useEffect, useState } from "react";

export function AnonymousHandleSection() {
  const [handle, setHandle] = useState("");
  const [savedHandle, setSavedHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState<number>(0);
  const [canChangeAt, setCanChangeAt] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/settings/anonymous-handle", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setSavedHandle(d.handle ?? null);
        setHandle(d.handle ?? "");
        setCooldownRemainingSeconds(Number(d.cooldownRemainingSeconds) || 0);
        setCanChangeAt(typeof d.canChangeAt === "string" ? d.canChangeAt : null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (cooldownRemainingSeconds <= 0) return;
    const t = setInterval(() => {
      setCooldownRemainingSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownRemainingSeconds]);

  const cooldownActive = !!savedHandle && cooldownRemainingSeconds > 0;
  const cooldownDays = Math.ceil(cooldownRemainingSeconds / (24 * 3600));

  async function save() {
    const trimmed = handle.trim();
    setError(null);
    setSuccess(null);
    if (!trimmed) {
      setError("Please enter a handle.");
      return;
    }
    if (cooldownActive) {
      setError(`You can change your handle again in ~${cooldownDays} day${cooldownDays === 1 ? "" : "s"}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/anonymous-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ handle: trimmed }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || "Could not save handle.");
        setCooldownRemainingSeconds(Number(payload?.cooldownRemainingSeconds) || 0);
        setCanChangeAt(typeof payload?.canChangeAt === "string" ? payload.canChangeAt : null);
      } else {
        setSavedHandle(payload.handle);
        setHandle(payload.handle);
        setSuccess("Saved.");
        setCooldownRemainingSeconds(Number(payload?.cooldownRemainingSeconds) || 0);
        setCanChangeAt(typeof payload?.canChangeAt === "string" ? payload.canChangeAt : null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-4">
      <h3 className="text-sm font-semibold">Anonymous handle</h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Used for discreet Q&amp;A posts and replies. Members will see <span className="font-semibold">u/your_handle</span>.
      </p>
      {loading ? (
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="e.g. oasis_reader"
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || cooldownActive}
            className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : savedHandle ? "Update" : "Save"}
          </button>
        </div>
      )}
      {error && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</div>}
      {success && <div className="mt-2 text-xs text-green-600 dark:text-green-400">{success}</div>}
      {savedHandle && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Current: <span className="font-semibold">u/{savedHandle}</span>
        </div>
      )}
      {cooldownActive && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          You can change this again {canChangeAt ? <>after {new Date(canChangeAt).toLocaleDateString()}</> : <>in ~{cooldownDays} days</>}.
        </div>
      )}
    </section>
  );
}

