import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB, PostModel } from "@/lib/db";
import mongoose from "mongoose";
import { PostEditClient } from "./PostEditClient";

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) notFound();
  const { postId } = await params;
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) notFound();

  await connectDB();
  const post = await PostModel.findById(postId).lean().exec();
  if (!post) notFound();

  const p = post as unknown as {
    authorId: mongoose.Types.ObjectId;
    mediaUrls: string[];
    caption?: string;
    visibility?: string;
  };
  if (String(p.authorId) !== session.userId) notFound();

  const visibility: "network" | "inner_circle" | "trusted_circle" =
    p.visibility === "inner_circle" || p.visibility === "trusted_circle" ? p.visibility : "network";

  return (
    <PostEditClient
      postId={postId}
      initialCaption={p.caption ?? ""}
      initialVisibility={visibility}
      mediaUrls={p.mediaUrls ?? []}
    />
  );
}
