import { MemberViewHeaderSkeleton } from "../MemberViewHeaderSkeleton";
import { MemberContentSkeleton } from "../MemberContentSkeleton";

export default function MemberLoading() {
  return (
    <div className="elite-events flex-1 overflow-y-auto min-h-full bg-[var(--elite-bg)] no-scrollbar">
      <MemberViewHeaderSkeleton />
      <div className="border-b border-[var(--elite-border)] bg-[var(--elite-bg)]">
        <div className="flex gap-4 px-4 py-3">
          <div className="h-4 w-14 rounded bg-[var(--elite-border-light)] animate-pulse" />
          <div className="h-4 w-14 rounded bg-[var(--elite-border-light)] animate-pulse" />
        </div>
      </div>
      <MemberContentSkeleton />
    </div>
  );
}
