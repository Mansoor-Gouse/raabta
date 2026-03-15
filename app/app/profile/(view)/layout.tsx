import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ProfileTabs } from "../ProfileTabs";
import { ProfileViewHeader } from "../ProfileViewHeader";
import { ProfileViewHeaderSkeleton } from "../ProfileViewHeaderSkeleton";
import { ProfileContentSkeleton } from "../ProfileContentSkeleton";

export default async function ProfileViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");

  return (
    <div className="elite-events flex-1 overflow-y-auto min-h-full bg-[var(--elite-bg)] no-scrollbar">
      <Suspense fallback={<ProfileViewHeaderSkeleton />}>
        <ProfileViewHeader />
      </Suspense>
      <ProfileTabs />
      <Suspense fallback={<ProfileContentSkeleton />}>
        {children}
      </Suspense>
    </div>
  );
}
