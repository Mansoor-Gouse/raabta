import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LikedGrid } from "./LikedGrid";

export default async function ProfileLikedPage() {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");
  return (
    <div className="flex-1 bg-[var(--elite-bg)] min-h-[40vh] no-scrollbar">
      <LikedGrid />
    </div>
  );
}
