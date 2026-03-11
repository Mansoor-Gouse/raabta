"use client";

interface StatusNewRecentsBarProps {
  onCancel: () => void;
}

export function StatusNewRecentsBar({ onCancel }: StatusNewRecentsBarProps) {
  return (
    <div
      className="shrink-0 flex items-center justify-between px-4 py-2.5"
      style={{ background: "var(--story-add-gradient-bar)" }}
    >
      <button
        type="button"
        className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 focus:outline-none"
        style={{ color: "var(--story-add-text)" }}
        aria-label="Recents"
      >
        Recents
        <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 text-sm font-medium hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/35"
        style={{ color: "var(--story-add-text)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Cancel
      </button>
    </div>
  );
}
