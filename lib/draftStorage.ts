const KEY_PREFIX = "chat_draft_";
const MAX_LENGTH = 12000;

function key(cid: string): string {
  return KEY_PREFIX + cid;
}

/**
 * Returns the stored draft for a channel. Safe for SSR and missing/disabled storage.
 */
export function getDraft(cid: string): string {
  if (typeof window === "undefined" || !cid) return "";
  try {
    const raw = localStorage.getItem(key(cid));
    if (raw == null) return "";
    const text = String(raw);
    return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) : text;
  } catch {
    return "";
  }
}

/**
 * Persists draft text for a channel. Truncates to MAX_LENGTH, removes key when empty.
 * Never throws; no-op when window or storage unavailable.
 */
export function setDraft(cid: string, text: string): void {
  if (typeof window === "undefined" || !cid) return;
  try {
    const toStore = text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) : text;
    if (toStore === "") {
      localStorage.removeItem(key(cid));
    } else {
      localStorage.setItem(key(cid), toStore);
    }
  } catch {
    // Quota exceeded or storage disabled; fail silently
  }
}
