"use client";

export type GuestsValues = {
  visibility: "network" | "invite-only";
  allowGuestRequest: boolean;
  allowBringGuest: boolean;
};

type GuestsBlockProps = {
  values: GuestsValues;
  onChange: (field: keyof GuestsValues, value: GuestsValues[keyof GuestsValues]) => void;
};

export function GuestsBlock({ values, onChange }: GuestsBlockProps) {
  return (
    <div className="elite-events space-y-5">
      <div>
        <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
          Who can see this event?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange("visibility", "network")}
            className={`flex-1 py-3 px-4 rounded-[var(--elite-radius)] border text-sm font-medium transition-colors ${
              values.visibility === "network"
                ? "bg-[var(--elite-accent)] text-[var(--elite-on-accent)] border-[var(--elite-accent)]"
                : "bg-[var(--elite-surface)] text-[var(--elite-text)] border-[var(--elite-border)] hover:border-[var(--elite-accent-muted)]"
            }`}
          >
            Network
          </button>
          <button
            type="button"
            onClick={() => onChange("visibility", "invite-only")}
            className={`flex-1 py-3 px-4 rounded-[var(--elite-radius)] border text-sm font-medium transition-colors ${
              values.visibility === "invite-only"
                ? "bg-[var(--elite-accent)] text-[var(--elite-on-accent)] border-[var(--elite-accent)]"
                : "bg-[var(--elite-surface)] text-[var(--elite-text)] border-[var(--elite-border)] hover:border-[var(--elite-accent-muted)]"
            }`}
          >
            Invite only
          </button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--elite-text-secondary)]">
          {values.visibility === "network"
            ? "Visible to all network members."
            : "Only people you invite can see and join."}
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={values.allowGuestRequest}
          onChange={(e) => onChange("allowGuestRequest", e.target.checked)}
          className="mt-1 rounded border-[var(--elite-border)] text-[var(--elite-accent)] focus:ring-[var(--elite-accent)]"
        />
        <span className="text-sm text-[var(--elite-text)]">
          Allow guests to request an invite (you approve each request).
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={values.allowBringGuest}
          onChange={(e) => onChange("allowBringGuest", e.target.checked)}
          className="mt-1 rounded border-[var(--elite-border)] text-[var(--elite-accent)] focus:ring-[var(--elite-accent)]"
        />
        <span className="text-sm text-[var(--elite-text)]">
          Allow attendees to bring a plus-one (if you enable this, you can still approve per guest).
        </span>
      </label>
    </div>
  );
}
