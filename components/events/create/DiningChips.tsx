"use client";

import { useState } from "react";
import { EliteChip, EliteInput } from "@/components/elite";
import { trigger as hapticTrigger } from "@/lib/haptics";

const OPTIONS = [
  "Hyderabadi Fine Dining",
  "Awadhi Cuisine",
  "Arabian Cuisine",
  "Ottoman Cuisine",
  "Mediterranean Dining",
  "Private Chef Experience",
  "Hyderabadi Dum Biryani & Kebabs",
] as const;

const OTHER_VALUE = "__other__";

type DiningChipsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DiningChips({ value, onChange }: DiningChipsProps) {
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
      onChange(opt);
    }
  };

  return (
    <div className="elite-events space-y-3">
      <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
        Dining experience
      </label>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <EliteChip
            key={opt}
            selected={value === opt}
            onClick={() => handleSelect(opt)}
            aria-label={`Dining: ${opt}`}
          >
            {opt}
          </EliteChip>
        ))}
        <EliteChip
          selected={!!showOther}
          onClick={() => handleSelect(OTHER_VALUE)}
          aria-label="Other dining"
        >
          Other
        </EliteChip>
      </div>
      {showOther && (
        <EliteInput
          placeholder="Describe dining experience"
          value={otherValue}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
