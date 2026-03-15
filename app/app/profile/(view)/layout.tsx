import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, User, PostModel, EventAttendeeModel } from "@/lib/db";
import { ProfileTabs } from "../ProfileTabs";
import { EditableProfileAvatar } from "../EditableProfileAvatar";
import { EditableCoverImage } from "../EditableCoverImage";

export default async function ProfileViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");
  await connectDB();
  const user = await User.findById(session.userId)
    .select(
      "fullName name headline bio location profileImage bannerImage industries interests expertise concerns company profession isVerified verificationLevel image"
    )
    .lean()
    .exec();
  if (!user) redirect("/login");

  const [postsCount, eventsCount] = await Promise.all([
    PostModel.countDocuments({ authorId: session.userId }).exec(),
    EventAttendeeModel.countDocuments({ userId: session.userId, status: "going" }).exec(),
  ]);

  const u = user as unknown as {
    fullName?: string;
    name?: string;
    headline?: string;
    bio?: string;
    location?: string;
    profileImage?: string;
    bannerImage?: string;
    industries?: string[];
    interests?: string[];
    expertise?: string[];
    concerns?: string[];
    company?: string;
    profession?: string;
    isVerified?: boolean;
    verificationLevel?: string;
    image?: string;
  };

  const displayName = u.fullName || u.name || session.phone || "Profile";
  const avatar = u.profileImage || u.image;

  return (
    <div className="elite-events flex-1 overflow-y-auto min-h-full bg-[var(--elite-bg)] no-scrollbar">
      <EditableCoverImage bannerImage={u.bannerImage} />
      <div className="px-4 pb-6 -mt-12 sm:-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <EditableProfileAvatar
            profileImage={avatar}
            displayName={displayName}
            isVerified={u.isVerified}
            verificationLevel={u.verificationLevel}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)] truncate">
                  {displayName}
                </h1>
                {u.headline && (
                  <p className="elite-body text-sm text-[var(--elite-text-secondary)] mt-0.5">
                    {u.headline}
                  </p>
                )}
              </div>
              <Link
                href="/app/profile/edit"
                className="elite-events shrink-0 flex items-center justify-center w-10 h-10 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors duration-[var(--elite-transition)]"
                aria-label="Edit profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex flex-col items-center">
                <span className="elite-heading font-semibold text-base text-[var(--elite-text)] tabular-nums">
                  {postsCount}
                </span>
                <span className="elite-body text-xs text-[var(--elite-text-muted)]">posts</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="elite-heading font-semibold text-base text-[var(--elite-text)] tabular-nums">
                  {eventsCount}
                </span>
                <span className="elite-body text-xs text-[var(--elite-text-muted)]">events</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href="/app/members"
                className="elite-events inline-flex items-center gap-2 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-2 text-sm font-medium text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors duration-[var(--elite-transition)]"
              >
                <svg className="w-4 h-4 shrink-0 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Members
              </Link>
              <Link
                href="/app/profile/circles"
                className="elite-events inline-flex items-center gap-2 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-2 text-sm font-medium text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors duration-[var(--elite-transition)]"
              >
                <svg className="w-4 h-4 shrink-0 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                My circles
              </Link>
            </div>
          </div>
        </div>

        {u.bio && (
          <p className="elite-body mt-4 text-sm text-[var(--elite-text-secondary)] whitespace-pre-wrap">
            {u.bio}
          </p>
        )}
        {u.location && (
          <p className="elite-body mt-2 text-sm text-[var(--elite-text-muted)] flex items-center gap-1">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {u.location}
          </p>
        )}

        {(u.industries?.length ?? 0) > 0 && (
          <div className="mt-4">
            <span className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
              Industries
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {u.industries!.map((i) => (
                <span
                  key={i}
                  className="elite-body inline-flex items-center rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-xs font-medium text-[var(--elite-text-secondary)]"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.interests?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
              Interests
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {u.interests!.map((i) => (
                <span
                  key={i}
                  className="elite-body inline-flex items-center rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-xs font-medium text-[var(--elite-text)]"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.expertise?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
              Expertise
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(u.expertise ?? []).map((e) => (
                <span
                  key={e}
                  className="elite-body inline-flex items-center rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-xs font-medium text-[var(--elite-text-secondary)]"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.concerns?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
              Concerns
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(u.concerns ?? []).map((c) => (
                <span
                  key={c}
                  className="elite-body inline-flex items-center rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-xs font-medium text-[var(--elite-text-secondary)]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.company || u.profession) && (
          <p className="elite-body mt-3 text-sm text-[var(--elite-text-secondary)]">
            {u.profession}
            {u.profession && u.company && " at "}
            {u.company}
          </p>
        )}
      </div>
      <ProfileTabs />
      {children}
    </div>
  );
}
