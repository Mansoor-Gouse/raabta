"use client";

import { EliteChip } from "@/components/elite";

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

const PRESETS = [
  { id: "weekend", label: "This weekend", get: getThisWeekend },
  { id: "nextweek", label: "Next week", get: getNextWeek },
  { id: "nextmonth", label: "Next month", get: getNextMonth },
] as const;

type QuickDateChipsProps = {
  onSelect: (startAt: string, endAt: string) => void;
  selectedId?: string | null;
};

export function QuickDateChips({ onSelect, selectedId }: QuickDateChipsProps) {
  return (
    <div className="elite-events">
      <p className="text-xs font-medium text-[var(--elite-text-muted)] mb-2">Quick pick</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <EliteChip
            key={p.id}
            selected={selectedId === p.id}
            onClick={() => {
              if (selectedId === p.id) {
                onSelect("", "");
              } else {
                const { startAt, endAt } = p.get();
                onSelect(startAt, endAt);
              }
            }}
            aria-label={selectedId === p.id ? `Clear date` : `Set date to ${p.label}`}
          >
            {p.label}
          </EliteChip>
        ))}
      </div>
    </div>
  );
}
