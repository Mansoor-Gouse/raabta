"use client";

export type SegmentState = "filled" | "active" | "pending";

type StoryProgressBarsProps = {
  total: number;
  activeIndex: number;
  progress: number; // 0..1 for active segment
  segmentStates?: SegmentState[];
};

export function StoryProgressBars({
  total,
  activeIndex,
  progress,
}: StoryProgressBarsProps) {
  if (total <= 0) return null;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-3"
      style={{
        paddingTop: "calc(0.5rem + var(--safe-area-inset-top))",
        paddingBottom: "6px",
        minHeight: "calc(0.5rem + var(--safe-area-inset-top) + 2px + 6px)",
      }}
      aria-hidden
    >
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < activeIndex;
        const isActive = i === activeIndex;
        const fill = isFilled ? 1 : isActive ? progress : 0;
        return (
          <div
            key={i}
            className="h-0.5 flex-1 min-w-0 rounded-full bg-white/30 overflow-hidden shrink-0"
          >
            <div
              className="h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
              style={{ width: `${fill * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
