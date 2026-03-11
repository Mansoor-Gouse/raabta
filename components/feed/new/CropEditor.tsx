"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImg, buildFilterString, type FilterPreset, type FilterOptions } from "@/lib/cropImage";

const FILTER_PRESETS: { id: FilterPreset; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "grayscale", label: "B&W" },
  { id: "sepia", label: "Sepia" },
  { id: "vintage", label: "Vintage" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
];

const ASPECT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Square" },
  { value: 4 / 5, label: "Portrait" },
];

type CropEditorProps = {
  imageSrc: string;
  aspect?: number;
  onDone: (croppedBlob: Blob) => void;
  onSkip?: () => void;
};

export function CropEditor({
  imageSrc,
  aspect = 1,
  onDone,
  onSkip,
}: CropEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const [preset, setPreset] = useState<FilterPreset>("none");
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [aspectRatio, setAspectRatio] = useState(() => aspect);

  const onCropAreaChange = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const filterOptions: FilterOptions = {
    preset: preset !== "none" ? preset : undefined,
    brightness: brightness !== 1 ? brightness : undefined,
    contrast: contrast !== 1 ? contrast : undefined,
    saturation: saturation !== 1 ? saturation : undefined,
  };
  const fullFilterOptions: FilterOptions = {
    preset: preset !== "none" ? preset : undefined,
    brightness,
    contrast,
    saturation,
  };
  const hasFilters = preset !== "none" || brightness !== 1 || contrast !== 1 || saturation !== 1;

  async function handleApply() {
    if (!croppedAreaPixels) {
      onSkip?.();
      return;
    }
    setApplying(true);
    try {
      const blob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        hasFilters ? filterOptions : undefined
      );
      onDone(blob);
    } catch {
      onSkip?.();
    } finally {
      setApplying(false);
    }
  }

  const effectiveAspect = aspectRatio;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex gap-2 px-3 py-2 border-b border-[var(--ig-border-light)]">
        {ASPECT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setAspectRatio(value)}
            className={`min-h-[44px] flex-1 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)] focus:ring-offset-2 focus:ring-offset-[var(--ig-bg-primary)] ${
              effectiveAspect === value
                ? "bg-[var(--ig-text)] text-[var(--ig-bg-primary)]"
                : "bg-[var(--ig-border-light)] text-[var(--ig-text)] hover:bg-[var(--ig-border)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative flex-1 min-h-[300px] bg-[var(--ig-text)]">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={effectiveAspect}
          onCropChange={setCrop}
          onCropAreaChange={onCropAreaChange}
          onZoomChange={setZoom}
          style={{
            containerStyle: { background: "var(--ig-bg)" },
            mediaStyle: { filter: buildFilterString(fullFilterOptions) },
          }}
        />
      </div>
      <div className="flex flex-col shrink-0 border-t border-[var(--ig-border-light)] max-h-[50vh]">
        <div className="p-3 space-y-3 overflow-auto flex-1 min-h-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {FILTER_PRESETS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreset(id)}
                className={`shrink-0 min-h-[44px] px-3 py-2 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)] ${
                  preset === id
                    ? "bg-[var(--ig-text)] text-[var(--ig-bg-primary)]"
                    : "bg-[var(--ig-border-light)] text-[var(--ig-text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ig-text-secondary)] w-16">Brightness</span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-lg appearance-none bg-[var(--ig-border-light)] accent-[var(--ig-link)] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ig-text-secondary)] w-16">Contrast</span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-lg appearance-none bg-[var(--ig-border-light)] accent-[var(--ig-link)] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--ig-text-secondary)] w-16">Saturation</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-lg appearance-none bg-[var(--ig-border-light)] accent-[var(--ig-link)] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--ig-text-secondary)] w-16">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-lg appearance-none bg-[var(--ig-border-light)] accent-[var(--ig-link)] focus:outline-none"
            />
          </div>
        </div>
        <div className="shrink-0 p-3 pt-0 flex gap-2 border-t border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="min-h-[44px] px-4 py-2.5 rounded-lg border border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)] focus:ring-offset-2"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="min-h-[44px] flex-1 py-2.5 rounded-lg bg-[var(--ig-link)] text-white text-sm font-semibold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)] focus:ring-offset-2"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
