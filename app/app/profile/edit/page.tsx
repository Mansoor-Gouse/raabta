import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { ProfileEditForm } from "./ProfileEditForm";

export default async function ProfileEditPage() {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");
  await connectDB();
  const user = await User.findById(session.userId).lean();
  if (!user) redirect("/login");

  type Visibility = "everyone" | "trusted_circle" | "inner_circle";
  const u = user as {
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
    languages?: string[];
    preferredDestinations?: string[];
    company?: string;
    profession?: string;
    communityRoles?: string[];
    profileVisibilityPosts?: Visibility;
    profileVisibilityEvents?: Visibility;
    profileVisibilityBio?: Visibility;
    profileVisibilityCircles?: Visibility;
  };
  const initial = {
    fullName: u.fullName ?? u.name ?? "",
    headline: u.headline ?? "",
    bio: u.bio ?? "",
    location: u.location ?? "",
    profileImage: u.profileImage ?? "",
    bannerImage: u.bannerImage ?? "",
    industries: u.industries ?? [],
    interests: u.interests ?? [],
    expertise: u.expertise ?? [],
    concerns: u.concerns ?? [],
    languages: u.languages ?? [],
    preferredDestinations: u.preferredDestinations ?? [],
    company: u.company ?? "",
    profession: u.profession ?? "",
    communityRoles: u.communityRoles ?? [],
    profileVisibilityPosts: (u.profileVisibilityPosts ?? "everyone") as "everyone" | "trusted_circle" | "inner_circle",
    profileVisibilityEvents: (u.profileVisibilityEvents ?? "everyone") as "everyone" | "trusted_circle" | "inner_circle",
    profileVisibilityBio: (u.profileVisibilityBio ?? "everyone") as "everyone" | "trusted_circle" | "inner_circle",
    profileVisibilityCircles: (u.profileVisibilityCircles ?? "everyone") as "everyone" | "trusted_circle" | "inner_circle",
  };

  return (
    <div className="elite-events flex-1 overflow-y-auto bg-[var(--elite-bg)] no-scrollbar">
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/app/profile"
            className="elite-events shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors"
            aria-label="Back to profile"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--elite-surface)] border border-[var(--elite-border)] text-2xl" aria-hidden>
            ✏️
          </span>
          <div className="min-w-0">
            <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)]">
              Edit profile
            </h1>
            <p className="elite-body text-sm text-[var(--elite-text-muted)] mt-0.5">
              Make it you — photos, bio, tags & more
            </p>
          </div>
        </div>
        <ProfileEditForm initial={initial} />
      </div>
    </div>
  );
}
