import { MemberEventsClient } from "../../MemberEventsClient";

export default async function MemberEventsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <MemberEventsClient userId={userId} />;
}
