/**
 * Display name helper: fullName || name || masked phone.
 * Used across events module for host and attendee names.
 */

export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== "string") return "***";
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return last4.length >= 4 ? `***${last4}` : "***";
}

export type UserForDisplay = {
  fullName?: string;
  name?: string;
  phone?: string;
} | null;

export function getDisplayName(user: UserForDisplay): string {
  if (!user) return "Guest";
  const name = user.fullName || user.name;
  if (name && String(name).trim()) return String(name).trim();
  if (user.phone) return maskPhone(user.phone);
  return "Guest";
}
