import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ProfileEventsClient } from "./ProfileEventsClient";

export default async function ProfileEventsPage() {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");
  return <ProfileEventsClient />;
}
