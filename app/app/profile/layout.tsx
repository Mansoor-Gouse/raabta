import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, User, PostModel, EventAttendeeModel } from "@/lib/db";
import { ProfileTabs } from "./ProfileTabs";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");
  await connectDB();
  const user = await User.findById(session.userId).lean();
  if (!user) redirect("/login");

  const [postsCount, eventsCount] = await Promise.all([
    PostModel.countDocuments({ authorId: session.userId }).exec(),
    EventAttendeeModel.countDocuments({ userId: session.userId, status: "going" }).exec(),
  ]);

  const displayName =
    (user as { fullName?: string }).fullName ||
    (user as { name?: string }).name ||
    session.phone;
  const avatar =
    (user as { profileImage?: string }).profileImage ||
    (user as { image?: string }).image;
  const headline = (user as { headline?: string }).headline;
  const bio = (user as { bio?: string }).bio;
  const location = (user as { location?: string }).location;
  const industries = (user as { industries?: string[] }).industries ?? [];
  const interests = (user as { interests?: string[] }).interests ?? [];
  const isVerified = (user as { isVerified?: boolean }).isVerified;

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg)]">
      <div className="px-4 pt-6 pb-4 border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]">
        <div className="flex items-start gap-6">
          <div className="relative shrink-0">
            <div className="w-[86px] h-[86px] rounded-full overflow-hidden flex items-center justify-center bg-[var(--ig-border-light)]">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-medium text-[var(--ig-text-secondary)]">
                  {displayName?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            {isVerified && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--ig-link)] flex items-center justify-center text-white"
                title="Verified"
                aria-hidden
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col items-stretch">
            <div className="flex items-center gap-6 mb-4">
              <div className="flex flex-col items-center">
                <span className="font-semibold text-[var(--ig-text)] text-base">{postsCount}</span>
                <span className="text-xs text-[var(--ig-text-secondary)]">posts</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-semibold text-[var(--ig-text)] text-base">{eventsCount}</span>
                <span className="text-xs text-[var(--ig-text-secondary)]">events</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-semibold text-[var(--ig-text)] text-base">—</span>
                <span className="text-xs text-[var(--ig-text-secondary)]">groups</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/app/profile/edit"
                className="rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] py-1.5 px-4 text-center text-sm font-semibold text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
              >
                Edit profile
              </Link>
              <Link
                href="/app/members"
                className="rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] py-1.5 px-4 text-center text-sm font-semibold text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
              >
                Members
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <h1 className="font-semibold text-[var(--ig-text)] text-sm">{displayName}</h1>
          {headline && <p className="text-sm text-[var(--ig-text)] mt-0.5">{headline}</p>}
          {bio && <p className="text-sm text-[var(--ig-text)] mt-1 whitespace-pre-wrap">{bio}</p>}
          {location && (
            <p className="text-sm text-[var(--ig-text-secondary)] mt-1 flex items-center gap-1">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {location}
            </p>
          )}
          {(industries.length > 0 || interests.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {industries.slice(0, 3).map((i) => (
                <span key={i} className="text-xs text-[var(--ig-text-secondary)] bg-[var(--ig-border-light)] rounded px-2 py-0.5">
                  {i}
                </span>
              ))}
              {interests.slice(0, 3).map((i) => (
                <span key={i} className="text-xs text-[var(--ig-link)]">#{i}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <ProfileTabs />
      {children}
    </div>
  );
}
