/**
 * One text overlay on a status (story) item.
 * Coordinates x,y are 0-100 (percentage of container); origin top-left.
 */
export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  fontWeight?: "normal" | "bold";
  textAlign?: "left" | "center" | "right";
  rotation?: number;
  scale?: number;
}

export const DEFAULT_TEXT_OVERLAY: Omit<TextOverlay, "id"> = {
  text: "Text",
  x: 50,
  y: 50,
  fontSize: 24,
  fontFamily: "system",
  color: "#ffffff",
  backgroundColor: "transparent",
  fontWeight: "normal",
  textAlign: "center",
  rotation: 0,
  scale: 1,
};

export const TEXT_OVERLAY_COLORS = [
  "#ffffff",
  "#000000",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
] as const;

export const TEXT_OVERLAY_FONTS = [
  { value: "system", label: "System" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
] as const;

export const MAX_OVERLAYS_PER_STATUS = 20;
export const MAX_OVERLAY_TEXT_LENGTH = 200;
