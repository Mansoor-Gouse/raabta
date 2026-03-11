"use client";

import { EliteChip } from "@/components/elite";
import { trigger as hapticTrigger } from "@/lib/haptics";

const OPTIONS = [
  "Investment Collaboration",
  "Business Networking",
  "Philanthropy Discussion",
  "Community Leadership",
] as const;

type NetworkingIntentChipsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function NetworkingIntentChips({ value, onChange }: NetworkingIntentChipsProps) {
  return (
    <div className="elite-events space-y-3">
      <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
        Event purpose
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
            aria-label={value === opt ? `Clear purpose` : `Purpose: ${opt}`}
          >
            {opt}
          </EliteChip>
        ))}
      </div>
    </div>
  );
}
