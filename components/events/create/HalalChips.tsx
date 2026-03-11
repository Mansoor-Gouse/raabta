"use client";

import { useState } from "react";
import { EliteChip, EliteInput } from "@/components/elite";

const OPTIONS = [
  "Full halal",
  "Vegetarian options",
  "No pork",
  "Details to follow",
] as const;

const OTHER_VALUE = "__other__";

type HalalChipsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function HalalChips({ value, onChange }: HalalChipsProps) {
  const isOther = value && !OPTIONS.includes(value as (typeof OPTIONS)[number]);
  const [showOther, setShowOther] = useState(isOther);
  const otherValue = isOther ? value : "";

  const handleSelect = (opt: string) => {
    if (opt === OTHER_VALUE) {
      setShowOther(true);
      onChange("");
    } else {
      setShowOther(false);
      onChange(opt);
    }
  };

  return (
    <div className="elite-events space-y-3">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <EliteChip
            key={opt}
            selected={value === opt}
            onClick={() => handleSelect(opt)}
            aria-label={`Halal: ${opt}`}
          >
            {opt}
          </EliteChip>
        ))}
        <EliteChip
          selected={!!showOther}
          onClick={() => handleSelect(OTHER_VALUE)}
          aria-label="Other"
        >
          Other
        </EliteChip>
      </div>
      {showOther && (
        <div className="elite-reveal transition-opacity duration-[var(--elite-transition)]">
          <EliteInput
            label="Halal menu"
            placeholder="e.g. Buffet, set menu"
            value={otherValue}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
