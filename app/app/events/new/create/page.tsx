import { getSession } from "@/lib/auth";
import { EliteEventCreateWizard } from "./EliteEventCreateWizard";

export default async function CreateEventPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const session = await getSession();
  const hostName = session?.isLoggedIn && (session.name || session.phone) ? (session.name || session.phone) : "Host";
  const { kind } = await searchParams;
  return <EliteEventCreateWizard kind={kind ?? "private-gathering"} hostName={hostName} />;
}
