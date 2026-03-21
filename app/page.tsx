import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/** Logged-out landing is the network page (`/network`). */
export default async function HomePage() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect("/app/feed");
  }
  redirect("/network");
}
