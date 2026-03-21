import { MemberPostsGrid } from "../MemberPostsGrid";
import { MemberSectionCarousel } from "../MemberSectionCarousel";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <MemberSectionCarousel userId={userId} section="posts">
      <MemberPostsGrid userId={userId} />
    </MemberSectionCarousel>
  );
}
