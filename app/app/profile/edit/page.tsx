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
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <div className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Edit profile
        </h1>
        <ProfileEditForm initial={initial} />
      </div>
    </div>
  );
}
