/**
 * Haptic feedback via Vibration API.
 * Works on Android; iOS Safari has limited/no support (graceful no-op).
 * Disabled when user prefers reduced motion.
 */

export type HapticType = "light" | "medium" | "success" | "error";

const PATTERNS: Record<HapticType, number | number[]> = {
  light: [10],
  medium: [15],
  success: [10, 50, 10],
  error: [30],
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isHapticsSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.vibrate === "function";
}

export function trigger(type: HapticType): void {
  if (!isHapticsSupported() || prefersReducedMotion()) return;
  const pattern = PATTERNS[type];
  try {
    navigator.vibrate(pattern);
  } catch {
    // no-op on unsupported environments
  }
}
