"use client";

import { useState } from "react";
import { EliteChip, EliteInput } from "@/components/elite";

const OPTIONS = [
  "Black tie",
  "Smart casual",
  "Business formal",
  "Casual",
  "Traditional",
  "No preference",
] as const;

const OTHER_VALUE = "__other__";

type DressCodeChipsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DressCodeChips({ value, onChange }: DressCodeChipsProps) {
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
            aria-label={`Dress code: ${opt}`}
          >
            {opt}
          </EliteChip>
        ))}
        <EliteChip
          selected={!!showOther}
          onClick={() => handleSelect(OTHER_VALUE)}
          aria-label="Other dress code"
        >
          Other
        </EliteChip>
      </div>
      {showOther && (
        <div className="elite-reveal transition-opacity duration-[var(--elite-transition)]">
          <EliteInput
            label="Dress code"
            placeholder="e.g. Formal modest"
            value={otherValue}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
