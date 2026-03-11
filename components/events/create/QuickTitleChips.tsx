"use client";

import { EliteChip } from "@/components/elite";

type QuickTitleChipsProps = {
  value: string;
  onChange: (title: string) => void;
  suggestions: string[];
};

export function QuickTitleChips({ value, onChange, suggestions }: QuickTitleChipsProps) {
  if (suggestions.length === 0) return null;
  return (
    <div className="elite-events">
      <p className="text-xs font-medium text-[var(--elite-text-muted)] mb-2">Quick pick</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <EliteChip
            key={s}
            selected={value === s}
            onClick={() => onChange(s)}
            aria-label={`Set title to ${s}`}
          >
            {s}
          </EliteChip>
        ))}
      </div>
    </div>
  );
}
