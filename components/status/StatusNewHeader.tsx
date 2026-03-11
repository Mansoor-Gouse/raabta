"use client";

interface StatusNewHeaderProps {
  title: string;
  onClose: () => void;
  rightSlot?: React.ReactNode;
}

export function StatusNewHeader({ title, onClose, rightSlot }: StatusNewHeaderProps) {
  return (
    <header
      className="shrink-0 flex items-center justify-between px-4 py-3"
      style={{ background: "var(--story-add-gradient-header)", color: "var(--story-add-text)" }}
    >
      <button
        type="button"
        onClick={onClose}
        className="p-2 -ml-2 rounded-lg hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white/30"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="w-9 flex items-center justify-end">
        {rightSlot ?? <span className="w-5 h-5" aria-hidden />}
      </div>
    </header>
  );
}
