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

const ASPECT_OPTIONS: { value: number; label: string; icon: string }[] = [
  { value: 1, label: "Square", icon: "▢" },
  { value: 16 / 10, label: "Landscape", icon: "▭" },
  { value: 4 / 5, label: "Portrait", icon: "▯" },
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
    <div className="flex flex-col h-full p-4">
      <div className="post-flow-card flex flex-col flex-1 min-h-0 overflow-hidden post-flow-animate-in">
        <div className="shrink-0 flex gap-2 px-3 py-3 border-b border-[var(--ig-border-light)]">
          {ASPECT_OPTIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAspectRatio(value)}
              className={`min-h-[44px] flex-1 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)] focus:ring-offset-2 focus:ring-offset-[var(--post-flow-gradient-start)] flex items-center justify-center gap-1.5 ${
                effectiveAspect === value
                  ? "bg-[var(--ig-text)] text-[var(--post-flow-gradient-start)] shadow-md"
                  : "bg-[var(--ig-border-light)] text-[var(--ig-text)] hover:bg-[var(--ig-border)]"
              }`}
            >
              <span className="text-lg leading-none opacity-80" aria-hidden>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-h-[280px] bg-[var(--ig-text)]">
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
        <div className="flex flex-col shrink-0 border-t border-[var(--ig-border-light)] max-h-[50vh] bg-[var(--post-flow-card)]">
          <div className="p-4 space-y-4 overflow-auto flex-1 min-h-0">
            <p className="post-flow-label flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              Filters
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {FILTER_PRESETS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreset(id)}
                  className={`shrink-0 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)] focus:ring-offset-2 ${
                    preset === id
                      ? "bg-[var(--ig-text)] text-[var(--post-flow-gradient-start)] shadow-md"
                      : "bg-[var(--ig-border-light)] text-[var(--ig-text)] hover:bg-[var(--ig-border)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="post-flow-label w-20 flex items-center gap-1.5 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Bright
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="post-flow-slider flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="post-flow-label w-20 shrink-0">Contrast</span>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="post-flow-slider flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="post-flow-label w-20 shrink-0">Saturation</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="post-flow-slider flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="post-flow-label w-20 flex items-center gap-1.5 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                  Zoom
                </span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="post-flow-slider flex-1"
                />
              </div>
            </div>
          </div>
          <div className="shrink-0 p-4 pt-0 flex gap-3 border-t border-[var(--ig-border-light)]">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="min-h-[48px] px-5 py-2.5 rounded-xl border-2 border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-medium hover:bg-[var(--ig-border-light)] transition-all active:scale-[0.98]"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="post-flow-cta min-h-[48px] flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
            >
              {applying ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
