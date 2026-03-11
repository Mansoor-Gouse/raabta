import { notFound, redirect } from "next/navigation";

const TYPE_TO_KIND: Record<string, string> = {
  event: "private-gathering",
  trip: "trip-retreat",
  retreat: "trip-retreat",
  umrah: "umrah-hajj",
  hajj: "umrah-hajj",
};

const VALID_TYPES = ["event", "trip", "retreat", "umrah", "hajj"] as const;

export default async function NewEventTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    notFound();
  }
  redirect(`/app/events/new/create?kind=${TYPE_TO_KIND[type] ?? "private-gathering"}`);
}
