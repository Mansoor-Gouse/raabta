"use client";

import { EliteInput } from "@/components/elite";
import { QuickTitleChips } from "./QuickTitleChips";
import { QuickDateChips } from "./QuickDateChips";
import { LocationChips } from "./LocationChips";

export type BasicsValues = {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
};

const DEFAULT_LOCATION_OPTIONS = [
  "Dubai",
  "London",
  "Riyadh",
  "Jeddah",
  "Istanbul",
  "Maldives",
  "Private venue",
  "To be confirmed",
];

type BasicsBlockProps = {
  values: BasicsValues;
  onChange: (field: keyof BasicsValues, value: string) => void;
  errors?: Partial<Record<keyof BasicsValues, string>>;
  showLocation?: boolean;
  titleSuggestions?: string[];
  locationOptions?: string[];
};

export function BasicsBlock({
  values,
  onChange,
  errors = {},
  showLocation = true,
  titleSuggestions = [],
  locationOptions = DEFAULT_LOCATION_OPTIONS,
}: BasicsBlockProps) {
  const quickDateId =
    values.startAt && values.endAt
      ? (() => {
          const { startAt, endAt } = getThisWeekend();
          if (values.startAt === startAt && values.endAt === endAt) return "weekend";
          const nw = getNextWeek();
          if (values.startAt === nw.startAt && values.endAt === nw.endAt) return "nextweek";
          const nm = getNextMonth();
          if (values.startAt === nm.startAt && values.endAt === nm.endAt) return "nextmonth";
          return null;
        })()
      : null;

  return (
    <div className="elite-events space-y-5">
      <div className="space-y-3">
        {titleSuggestions.length > 0 && (
          <QuickTitleChips
            value={values.title}
            onChange={(v) => onChange("title", v)}
            suggestions={titleSuggestions}
          />
        )}
        <EliteInput
          label="Event title *"
          placeholder="e.g. Annual Gala Dinner"
          value={values.title}
          onChange={(e) => onChange("title", e.target.value)}
          error={errors.title}
        />
      </div>

      <div className="space-y-3">
        <QuickDateChips
          selectedId={quickDateId}
          onSelect={(startAt, endAt) => {
            onChange("startAt", startAt);
            onChange("endAt", endAt);
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <EliteInput
            label="Start *"
            type="datetime-local"
            value={values.startAt}
            onChange={(e) => onChange("startAt", e.target.value)}
            error={errors.startAt}
          />
          <EliteInput
            label="End"
            type="datetime-local"
            value={values.endAt}
            onChange={(e) => onChange("endAt", e.target.value)}
            error={errors.endAt}
          />
        </div>
      </div>

      {showLocation && (
        <div>
          <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
            Location
          </label>
          <LocationChips
            value={values.location}
            onChange={(v) => onChange("location", v)}
            options={locationOptions}
            otherPlaceholder="Venue or city"
          />
          {errors.location && (
            <p className="mt-1 text-sm text-[var(--elite-error)]">{errors.location}</p>
          )}
        </div>
      )}
    </div>
  );
}

function toDatetimeLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function getThisWeekend(): { startAt: string; endAt: string } {
  const now = new Date();
  const day = now.getDay();
  const satOffset = day === 0 ? -6 : 6 - day;
  const sat = new Date(now);
  sat.setDate(now.getDate() + satOffset);
  sat.setHours(10, 0, 0, 0);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(18, 0, 0, 0);
  return { startAt: toDatetimeLocal(sat), endAt: toDatetimeLocal(sun) };
}

function getNextWeek(): { startAt: string; endAt: string } {
  const now = new Date();
  const nextMon = new Date(now);
  nextMon.setDate(now.getDate() + ((8 - now.getDay()) % 7) || 7);
  nextMon.setHours(9, 0, 0, 0);
  const nextFri = new Date(nextMon);
  nextFri.setDate(nextMon.getDate() + 4);
  nextFri.setHours(18, 0, 0, 0);
  return { startAt: toDatetimeLocal(nextMon), endAt: toDatetimeLocal(nextFri) };
}

function getNextMonth(): { startAt: string; endAt: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setHours(18, 0, 0, 0);
  return { startAt: toDatetimeLocal(start), endAt: toDatetimeLocal(end) };
}
