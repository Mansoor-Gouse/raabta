import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { MemberTabs } from "../MemberTabs";
import { MemberViewHeader } from "../MemberViewHeader";
import { MemberViewHeaderSkeleton } from "../MemberViewHeaderSkeleton";

export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) notFound();
  const { userId: profileUserId } = await params;

  return (
    <div className="elite-events flex-1 overflow-y-auto min-h-full bg-[var(--elite-bg)] no-scrollbar">
      <Suspense fallback={<MemberViewHeaderSkeleton />}>
        <MemberViewHeader profileUserId={profileUserId} />
      </Suspense>
      <MemberTabs userId={profileUserId} />
      {children}
    </div>
  );
}
