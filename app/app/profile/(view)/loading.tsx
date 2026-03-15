import { ProfileViewHeaderSkeleton } from "../ProfileViewHeaderSkeleton";
import { ProfileTabs } from "../ProfileTabs";
import { ProfileContentSkeleton } from "../ProfileContentSkeleton";

export default function ProfileViewLoading() {
  return (
    <div className="elite-events flex-1 overflow-y-auto min-h-full bg-[var(--elite-bg)] no-scrollbar">
      <ProfileViewHeaderSkeleton />
      <ProfileTabs />
      <ProfileContentSkeleton />
    </div>
  );
}
