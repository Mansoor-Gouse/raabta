"use client";

import { useState } from "react";
import { EliteChip, EliteInput } from "@/components/elite";
import { trigger as hapticTrigger } from "@/lib/haptics";

const OPTIONS = [
  "Formal Suit",
  "Black Tie",
  "Traditional Kurta",
  "Traditional Sherwani",
  "Business Casual",
  "Traditional Kurta / Sherwani",
] as const;

const OTHER_VALUE = "__other__";

type EliteDressCodeChipsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function EliteDressCodeChips({ value, onChange }: EliteDressCodeChipsProps) {
  const isOther = value && !OPTIONS.includes(value as (typeof OPTIONS)[number]);
  const [showOther, setShowOther] = useState(isOther);
  const otherValue = isOther ? value : "";

  const handleSelect = (opt: string) => {
    hapticTrigger("light");
    if (opt === OTHER_VALUE) {
      setShowOther(true);
      onChange("");
    } else {
      setShowOther(false);
      onChange(value === opt ? "" : opt);
    }
  };

  return (
    <div className="elite-events space-y-3">
      <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
        Dress code
      </label>
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
          aria-label="Other"
        >
          Other
        </EliteChip>
      </div>
      {showOther && (
        <EliteInput
          placeholder="Dress code"
          value={otherValue}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
