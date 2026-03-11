/**
 * Create an HTMLImageElement from URL (for canvas drawing).
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

export type CroppedAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FilterPreset = "none" | "grayscale" | "sepia" | "vintage" | "warm" | "cool";

export type FilterOptions = {
  brightness?: number; // 0–2, 1 = normal
  contrast?: number;   // 0–2, 1 = normal
  saturation?: number; // 0–2, 1 = normal
  preset?: FilterPreset;
};

export function buildFilterString(opts: FilterOptions): string {
  const parts: string[] = [];
  parts.push(`brightness(${opts.brightness ?? 1})`);
  parts.push(`contrast(${opts.contrast ?? 1})`);
  parts.push(`saturate(${opts.saturation ?? 1})`);
  switch (opts.preset) {
    case "grayscale":
      parts.push("grayscale(1)");
      break;
    case "sepia":
      parts.push("sepia(1)");
      break;
    case "vintage":
      parts.push("sepia(0.4) contrast(1.1) saturate(0.9)");
      break;
    case "warm":
      parts.push("sepia(0.2) saturate(1.2)");
      break;
    case "cool":
      parts.push("saturate(0.8)");
      break;
    default:
      break;
  }
  return parts.join(" ");
}

/**
 * Crop image by the given pixel area, optionally apply filters, and return a blob (JPEG).
 */
export async function getCroppedImg(
  imageSrc: string,
  crop: CroppedAreaPixels,
  filterOptions?: FilterOptions
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");
  canvas.width = crop.width;
  canvas.height = crop.height;
  if (filterOptions && (filterOptions.preset || filterOptions.brightness !== undefined || filterOptions.contrast !== undefined || filterOptions.saturation !== undefined)) {
    ctx.filter = buildFilterString(filterOptions);
  }
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}
