export function ProfileContentSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5 bg-[var(--elite-bg)] p-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="aspect-square bg-[var(--elite-border-light)] animate-pulse" />
      ))}
    </div>
  );
}
