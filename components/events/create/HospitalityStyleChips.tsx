"use client";

import { EliteChip } from "@/components/elite";
import { trigger as hapticTrigger } from "@/lib/haptics";

const OPTIONS = [
  "Private Dinner",
  "Buffet Gathering",
  "Seated Banquet",
  "Majlis Style Seating",
] as const;

type HospitalityStyleChipsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function HospitalityStyleChips({ value, onChange }: HospitalityStyleChipsProps) {
  return (
    <div className="elite-events space-y-3">
      <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
        Hospitality style
      </label>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <EliteChip
            key={opt}
            selected={value === opt}
            onClick={() => {
              hapticTrigger("light");
              onChange(value === opt ? "" : opt);
            }}
            aria-label={value === opt ? `Clear hospitality` : `Hospitality: ${opt}`}
          >
            {opt}
          </EliteChip>
        ))}
      </div>
    </div>
  );
}
