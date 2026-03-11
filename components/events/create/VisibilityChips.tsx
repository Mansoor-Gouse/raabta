"use client";

import { EliteChip } from "@/components/elite";
import { trigger as hapticTrigger } from "@/lib/haptics";

export type VisibilityOption = "invite-only" | "network" | "invite-request";

type VisibilityChipsProps = {
  visibility: "" | "network" | "invite-only";
  allowGuestRequest: boolean;
  onChange: (visibility: "" | "network" | "invite-only", allowGuestRequest: boolean) => void;
};

const OPTIONS: { value: VisibilityOption; label: string; visibility: "network" | "invite-only"; allowGuestRequest: boolean }[] = [
  { value: "invite-only", label: "Invite Only", visibility: "invite-only", allowGuestRequest: false },
  { value: "network", label: "Network Members", visibility: "network", allowGuestRequest: false },
  { value: "invite-request", label: "Invite + Request", visibility: "invite-only", allowGuestRequest: true },
];

export function VisibilityChips({ visibility, allowGuestRequest, onChange }: VisibilityChipsProps) {
  const selectedValue: VisibilityOption | "" =
    visibility === "invite-only" && allowGuestRequest
      ? "invite-request"
      : visibility === "invite-only"
        ? "invite-only"
        : visibility === "network"
          ? "network"
          : "";

  return (
    <div className="elite-events">
      <p className="text-xs font-medium text-[var(--elite-text-muted)] mb-2">Visibility</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <EliteChip
            key={opt.value}
            selected={selectedValue === opt.value}
            onClick={() => {
              hapticTrigger("light");
              if (selectedValue === opt.value) {
                onChange("", false);
              } else {
                onChange(opt.visibility, opt.allowGuestRequest);
              }
            }}
            aria-label={selectedValue === opt.value ? `Clear visibility` : `Visibility: ${opt.label}`}
          >
            {opt.label}
          </EliteChip>
        ))}
      </div>
    </div>
  );
}
