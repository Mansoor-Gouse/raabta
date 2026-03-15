import { MemberPostsGrid } from "../MemberPostsGrid";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <MemberPostsGrid userId={userId} />;
}
