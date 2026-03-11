import { getSession } from "@/lib/auth";
import { EliteEventsClient } from "@/components/events/elite/EliteEventsClient";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const session = await getSession();
  const currentUserId = session?.isLoggedIn && session.userId ? session.userId : null;
  const { section } = await searchParams;
  return <EliteEventsClient currentUserId={currentUserId} initialSection={section} />;
}
