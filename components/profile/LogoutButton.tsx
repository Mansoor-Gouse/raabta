"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Could not log out");
        return;
      }
      router.push("/network");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="elite-events flex items-center justify-center w-10 h-10 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors duration-[var(--elite-transition)] disabled:opacity-50 disabled:pointer-events-none"
        aria-label="Log out"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-[var(--elite-text-muted)] border-t-transparent rounded-full animate-spin" aria-hidden />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        )}
      </button>
      {error && (
        <p className="elite-body text-xs text-[var(--elite-error)] max-w-[10rem] text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
