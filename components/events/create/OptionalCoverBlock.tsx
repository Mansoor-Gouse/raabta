"use client";

import { useState } from "react";
import { EliteChip, EliteInput } from "@/components/elite";

type OptionalCoverBlockProps = {
  value: string;
  onChange: (value: string) => void;
};

export function OptionalCoverBlock({ value, onChange }: OptionalCoverBlockProps) {
  const [showLink, setShowLink] = useState(!!value);

  return (
    <div className="elite-events space-y-3">
      <p className="text-xs font-medium text-[var(--elite-text-muted)] mb-2">Cover image</p>
      <div className="flex flex-wrap gap-2">
        <EliteChip
          selected={!showLink && !value}
          onClick={() => {
            setShowLink(false);
            onChange("");
          }}
          aria-label="Skip cover"
        >
          Skip
        </EliteChip>
        <EliteChip
          selected={showLink}
          onClick={() => setShowLink(true)}
          aria-label="Add cover link"
        >
          Add cover link
        </EliteChip>
      </div>
      {showLink && (
        <div className="elite-reveal transition-opacity duration-[var(--elite-transition)]">
          <EliteInput
            label="Image URL"
            type="url"
            placeholder="https://..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
