import { getSession } from "@/lib/auth";
import { ProfileGrid } from "../ProfileGrid";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.isLoggedIn) return null;
  return <ProfileGrid />;
}
