"use client";

import { useState } from "react";
import { EliteChip, EliteInput } from "@/components/elite";

export type VibeOption = { value: string; label: string };

const DEFAULT_VIBES: VibeOption[] = [
  { value: "Networking focus with fellow members.", label: "Networking" },
  { value: "A gathering for families and close connections.", label: "Family gathering" },
  { value: "Fundraising and giving back to the community.", label: "Fundraising" },
  { value: "A spiritual and reflective experience.", label: "Spiritual" },
  { value: "Wellness, rest, and connection.", label: "Wellness" },
  { value: "An exclusive dinner and conversation.", label: "Dinner & conversation" },
];

type DescriptionVibeChipsProps = {
  value: string;
  onChange: (value: string) => void;
  vibes?: VibeOption[];
};

export function DescriptionVibeChips({
  value,
  onChange,
  vibes = DEFAULT_VIBES,
}: DescriptionVibeChipsProps) {
  const [showAddLine, setShowAddLine] = useState(false);
  const selectedVibe = vibes.find((v) => v.value === value);
  const isCustom = value && !selectedVibe;
  const customValue = isCustom ? value : "";

  const handleSelect = (v: string) => {
    if (v === "__skip__") {
      setShowAddLine(false);
      onChange("");
    } else if (v === "__add__") {
      setShowAddLine(true);
    } else {
      setShowAddLine(false);
      onChange(value === v ? "" : v);
    }
  };

  return (
    <div className="elite-events space-y-3">
      <div className="flex flex-wrap gap-2">
        {vibes.map((v) => (
          <EliteChip
            key={v.value}
            selected={value === v.value}
            onClick={() => handleSelect(v.value)}
            aria-label={`Description: ${v.label}`}
          >
            {v.label}
          </EliteChip>
        ))}
        <EliteChip
          selected={!value}
          onClick={() => handleSelect("__skip__")}
          aria-label="Skip description"
        >
          Skip
        </EliteChip>
        <EliteChip
          selected={!!(showAddLine || isCustom)}
          onClick={() => handleSelect("__add__")}
          aria-label="Add a line"
        >
          Add a line
        </EliteChip>
      </div>
      {(showAddLine || isCustom) && (
        <div className="elite-reveal transition-opacity duration-[var(--elite-transition)]">
          <EliteInput
            label="Description"
            placeholder="One line about your event"
            value={customValue}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
