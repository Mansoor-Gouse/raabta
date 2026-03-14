import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SavedGrid } from "./SavedGrid";

export default async function ProfileSavedPage() {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");
  return (
    <div className="flex-1 bg-[var(--elite-bg)] min-h-[40vh] no-scrollbar">
      <SavedGrid />
    </div>
  );
}
