const STORAGE_KEY = "chat_pending_sends";
const MAX_QUEUE = 50;

export type QueuedItem = {
  id: string;
  cid: string;
  message: Record<string, unknown>;
  customMessageData?: Record<string, unknown>;
  options?: Record<string, unknown>;
};

function parseQueue(raw: string | null): QueuedItem[] {
  if (raw == null) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(items: QueuedItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota or disabled; fail silently
  }
}

/**
 * Returns pending sends from localStorage. SSR-safe; returns [] on error.
 */
export function getPendingSends(): QueuedItem[] {
  if (typeof window === "undefined") return [];
  try {
    return parseQueue(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/**
 * Appends an item to the queue. Drops oldest if at MAX_QUEUE. Never throws.
 */
export function enqueue(item: QueuedItem): void {
  if (typeof window === "undefined" || !item?.cid) return;
  try {
    const items = getPendingSends();
    items.push(item);
    if (items.length > MAX_QUEUE) {
      items.splice(0, items.length - MAX_QUEUE);
    }
    persist(items);
  } catch {
    // no throw
  }
}

/**
 * Replaces the entire queue (e.g. after removing sent items). Never throws.
 */
export function setPendingSends(items: QueuedItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const list = Array.isArray(items) ? items : [];
    persist(list);
  } catch {
    // no throw
  }
}

/**
 * Parses channel type and id from CID (e.g. "messaging:abc" -> ["messaging", "abc"]).
 */
export function parseCid(cid: string): { type: string; id: string } | null {
  if (!cid || typeof cid !== "string") return null;
  const idx = cid.indexOf(":");
  if (idx < 0) return null;
  return { type: cid.slice(0, idx), id: cid.slice(idx + 1) };
}
