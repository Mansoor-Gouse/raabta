"use client";

import { EliteChip } from "@/components/elite";

const PRESETS = [10, 20, 30, 50, 100] as const;

type CapacityPresetsProps = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
};

export function CapacityPresets({ value, onChange }: CapacityPresetsProps) {
  return (
    <div className="elite-events">
      <p className="text-xs font-medium text-[var(--elite-text-muted)] mb-2">Max attendees</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((n) => (
          <EliteChip
            key={n}
            selected={value === n}
            onClick={() => onChange(value === n ? undefined : n)}
            aria-label={value === n ? `Clear capacity` : `Capacity ${n}`}
          >
            {n}
          </EliteChip>
        ))}
        <EliteChip
          selected={value === undefined || value === 0}
          onClick={() => onChange(undefined)}
          aria-label="Unlimited"
        >
          Unlimited
        </EliteChip>
      </div>
    </div>
  );
}
