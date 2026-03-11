"use client";

import { useState } from "react";
import { EliteChip, EliteInput } from "@/components/elite";

const OPTIONS = [
  "Family-friendly",
  "Business networking",
  "Quiet reflection",
  "No photography",
  "Modest dress",
] as const;

type EtiquetteChipsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function EtiquetteChips({ value, onChange }: EtiquetteChipsProps) {
  const parts = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const optionSet = new Set(OPTIONS);
  const optionSelected = parts.filter((p) => optionSet.has(p as (typeof OPTIONS)[number]));
  const noteParts = parts.filter((p) => !optionSet.has(p as (typeof OPTIONS)[number]));
  const notePart = noteParts.length ? noteParts.join(", ") : "";
  const [showNote, setShowNote] = useState(!!notePart);

  const toggle = (opt: string) => {
    const set = new Set(optionSelected);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    const next = Array.from(set);
    const out = next.length ? next.join(", ") : "";
    onChange(showNote && notePart ? (out ? `${out}, ${notePart}` : notePart) : out);
  };

  const setNote = (v: string) => {
    const opts = optionSelected.join(", ");
    onChange(opts ? (v ? `${opts}, ${v}` : opts) : v);
  };

  return (
    <div className="elite-events space-y-3">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <EliteChip
            key={opt}
            selected={optionSelected.includes(opt)}
            onClick={() => toggle(opt)}
            aria-label={`Etiquette: ${opt}`}
          >
            {opt}
          </EliteChip>
        ))}
        <EliteChip
          selected={showNote}
          onClick={() => {
            setShowNote(!showNote);
            if (!showNote) onChange(optionSelected.join(", "));
          }}
          aria-label="Add note"
        >
          Add note
        </EliteChip>
      </div>
      {showNote && (
        <div className="elite-reveal transition-opacity duration-[var(--elite-transition)]">
          <EliteInput
            label="Note"
            placeholder="Optional guidelines"
            value={notePart}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
