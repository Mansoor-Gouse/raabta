import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NetworkLanding } from "@/components/network/NetworkLanding";

export default async function HomePage() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect("/app/feed");
  }
  return <NetworkLanding />;
}
