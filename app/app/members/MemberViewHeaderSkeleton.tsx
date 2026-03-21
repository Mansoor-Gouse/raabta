export function MemberViewHeaderSkeleton() {
  return (
    <>
      <div className="h-32 sm:h-40 bg-[var(--elite-border-light)] animate-pulse" />
      <div className="px-4 pb-6 -mt-12 sm:-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[var(--elite-radius)] border-4 border-[var(--elite-bg)] bg-[var(--elite-border-light)] animate-pulse shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-6 w-48 max-w-[80%] rounded bg-[var(--elite-border-light)] animate-pulse" />
            <div className="h-4 w-32 rounded bg-[var(--elite-border-light)] animate-pulse" />
            <div className="flex items-center gap-6 mt-2 flex-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="h-5 w-8 rounded bg-[var(--elite-border-light)] animate-pulse" />
                  <div className="h-3 w-10 rounded bg-[var(--elite-border-light)] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-[var(--elite-border-light)] animate-pulse" />
          ))}
        </div>
      </div>
    </>
  );
}
