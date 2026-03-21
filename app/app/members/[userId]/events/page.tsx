import { MemberEventsClient } from "../../MemberEventsClient";
import { MemberSectionCarousel } from "../../MemberSectionCarousel";

export default async function MemberEventsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <MemberSectionCarousel userId={userId} section="events">
      <MemberEventsClient userId={userId} />
    </MemberSectionCarousel>
  );
}
