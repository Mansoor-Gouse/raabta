/** Loading UI for member profile tab content (header + tabs come from layout). */
export default function MemberProfileTabLoading() {
  return (
    <div className="grid grid-cols-3 gap-0.5 bg-[var(--elite-bg)] min-h-[200px]">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="aspect-square bg-[var(--elite-border-light)] animate-pulse" />
      ))}
    </div>
  );
}
