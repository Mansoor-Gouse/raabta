import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Providers } from "@/components/providers/Providers";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  return (
    <Providers userId={session.userId} name={session.name || session.phone} image={session.image}>
      <AppShell user={{ id: session.userId, name: session.name || session.phone, image: session.image }}>
        {children}
      </AppShell>
    </Providers>
  );
}
