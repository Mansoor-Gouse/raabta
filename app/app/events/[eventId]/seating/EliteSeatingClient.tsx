"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { EliteCard, EliteButton, EliteChip } from "@/components/elite";
import { trigger } from "@/lib/haptics";

type Table = { id: string; name: string; capacity?: number };
type Assignment = { userId: string; tableId: string; name?: string };

const TABLE_TEMPLATES: { name: string; capacity: number }[] = [
  { name: "Round (8)", capacity: 8 },
  { name: "Round (10)", capacity: 10 },
  { name: "Cabaret (6)", capacity: 6 },
  { name: "Banquet (4)", capacity: 4 },
];

type EliteSeatingClientProps = {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  isHost?: boolean;
};

export function EliteSeatingClient({
  eventId,
  eventTitle,
  eventDate,
  isHost = false,
}: EliteSeatingClientProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [myTableId, setMyTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [addingTable, setAddingTable] = useState(false);
  const tableRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch(`/api/events/${eventId}/seating`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTables(data.tables || []);
        setAssignments(data.assignments || []);
        setMyTableId(data.myTableId ?? null);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (selectedTableId && tableRefs.current[selectedTableId]) {
      tableRefs.current[selectedTableId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedTableId]);

  const getAttendeesAtTable = (tableId: string) =>
    assignments.filter((a) => a.tableId === tableId);

  async function addTableFromTemplate(template: { name: string; capacity: number }) {
    if (addingTable) return;
    trigger("light");
    setAddingTable(true);
    const newId = `table-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newTables = [...tables, { id: newId, name: template.name, capacity: template.capacity }];
    try {
      const res = await fetch(`/api/events/${eventId}/seating`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: newTables, assignments }),
      });
      if (res.ok) {
        setTables(newTables);
      }
    } finally {
      setAddingTable(false);
    }
  }

  return (
    <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <Link
          href={`/app/events/${eventId}`}
          onClick={() => trigger("light")}
          className="p-2 -ml-2 rounded-lg text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)]">Seating</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-[var(--elite-text-secondary)] mb-4">
          {eventTitle} · {new Date(eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>

        {loading ? (
          <div className="space-y-4">
            <div className="h-4 w-40 rounded bg-[var(--elite-border)] animate-pulse" />
            <div className="rounded-[var(--elite-radius)] border border-[var(--elite-border)] p-4 animate-pulse">
              <div className="h-5 w-24 rounded bg-[var(--elite-border)] mb-2" />
              <div className="h-4 w-full rounded bg-[var(--elite-border)]" />
            </div>
            <div className="rounded-[var(--elite-radius)] border border-[var(--elite-border)] p-4 animate-pulse">
              <div className="h-5 w-28 rounded bg-[var(--elite-border)] mb-2" />
              <div className="h-4 w-full rounded bg-[var(--elite-border)]" />
            </div>
          </div>
        ) : tables.length === 0 && !isHost ? (
          <EliteCard>
            <p className="text-sm text-[var(--elite-card-text)]">
              No seating plan has been published yet. Check back closer to the event.
            </p>
          </EliteCard>
        ) : (
          <>
            {(tables.length > 0 || isHost) && tables.length === 0 ? (
              <p className="text-sm text-[var(--elite-text-muted)] mb-4">Add tables using the templates above.</p>
            ) : null}
            <div className="flex items-center justify-between gap-2 mb-4">
              <p className="text-xs text-[var(--elite-text-muted)]">Tap a table to highlight</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { trigger("light"); setZoom((z) => Math.max(0.8, z - 0.2)); }}
                  className="elite-events h-8 w-8 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] flex items-center justify-center text-lg font-medium hover:bg-[var(--elite-border-light)] transition-colors"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => { trigger("light"); setZoom((z) => Math.min(1.4, z + 0.2)); }}
                  className="elite-events h-8 w-8 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] flex items-center justify-center text-lg font-medium hover:bg-[var(--elite-border-light)] transition-colors"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
            </div>
            <div
              className="space-y-4 transition-transform duration-200 origin-top"
              style={{ transform: `scale(${zoom})` }}
            >
              {myTableId && (
                <EliteCard accent>
                  <p className="text-xs font-medium text-[var(--elite-accent)] uppercase tracking-wide">Your table</p>
                  <p className="elite-heading font-semibold text-[var(--elite-card-text)]">
                    {tables.find((t) => t.id === myTableId)?.name ?? myTableId}
                </p>
                </EliteCard>
              )}
              {tables.map((table) => {
                const atTable = getAttendeesAtTable(table.id);
                const isSelected = selectedTableId === table.id;
                return (
                  <div
                    key={table.id}
                    ref={(el) => { tableRefs.current[table.id] = el; }}
                    className="scroll-mt-4"
                    role="button"
                    tabIndex={0}
                    onClick={() => { trigger("light"); setSelectedTableId((prev) => (prev === table.id ? null : table.id)); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { trigger("light"); setSelectedTableId((prev) => (prev === table.id ? null : table.id)); } }}
                    aria-label={`Table ${table.name}, ${atTable.length} seated`}
                  >
                    <EliteCard
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected ? "ring-2 ring-[var(--elite-accent)] shadow-[var(--elite-shadow-lg)]" : ""
                      }`}
                      accent={isSelected}
                    >
                      <h3 className="elite-heading font-semibold text-[var(--elite-card-text)]">
                        {table.name}
                        {table.capacity != null && (
                          <span className="text-sm font-normal text-[var(--elite-text-muted)] ml-2">
                            ({atTable.length}{table.capacity ? ` / ${table.capacity}` : ""})
                          </span>
                        )}
                      </h3>
                      {atTable.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {atTable.map((a) => (
                            <li key={a.userId}>
                              <Link
                                href={`/app/members/${a.userId}`}
                                className="text-sm text-[var(--elite-accent)] hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {a.name ?? "Guest"}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--elite-text-muted)] mt-1">No assignments yet</p>
                      )}
                    </EliteCard>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
