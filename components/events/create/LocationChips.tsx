"use client";

import { useState } from "react";
import { EliteChip, EliteInput } from "@/components/elite";

const OTHER_VALUE = "__other__";

type LocationChipsProps = {
  value: string;
  onChange: (location: string) => void;
  options: string[];
  otherPlaceholder?: string;
};

export function LocationChips({
  value,
  onChange,
  options,
  otherPlaceholder = "Enter location",
}: LocationChipsProps) {
  const isOther = value && !options.includes(value);
  const [showOther, setShowOther] = useState(isOther);
  const otherValue = isOther ? value : "";

  const handleChipSelect = (opt: string) => {
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
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <EliteChip
            key={opt}
            selected={value === opt}
            onClick={() => handleChipSelect(opt)}
            aria-label={`Location: ${opt}`}
          >
            {opt}
          </EliteChip>
        ))}
        <EliteChip
          selected={!!showOther}
          onClick={() => handleChipSelect(OTHER_VALUE)}
          aria-label="Other location"
        >
          Other
        </EliteChip>
      </div>
      {showOther && (
        <div
        className="elite-reveal transition-opacity duration-[var(--elite-transition)]"
        >
          <EliteInput
            label="Location"
            placeholder={otherPlaceholder}
            value={otherValue}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
