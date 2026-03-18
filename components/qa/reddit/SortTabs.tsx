"use client";

export type SortTab = { id: string; label: string };

export function SortTabs({
  tabs,
  activeId,
  onChange,
}: {
  tabs: SortTab[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              active
                ? "bg-[var(--qa-tab-active-bg)] text-[var(--qa-tab-active-text)] border-[var(--qa-tab-active-border)]"
                : "bg-[var(--qa-tab-bg)] text-[var(--qa-tab-text)] border-[var(--qa-tab-border)] hover:bg-[var(--qa-tab-hover-bg)]"
            }`}
            aria-pressed={active}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

