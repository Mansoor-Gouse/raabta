/**
 * Shared visibility types and helpers so profile settings and post visibility stay in sync.
 *
 * - Profile visibility: who can see a section on your profile (Posts tab, Events, etc.)
 *   Values: "everyone" | "trusted_circle" | "inner_circle"
 * - Post visibility: who can see a post in the feed and on your profile
 *   Values: "network" | "trusted_circle" | "inner_circle" (network = same as "everyone")
 */

export type ProfileVisibility = "everyone" | "trusted_circle" | "inner_circle";
export type PostVisibility = "network" | "trusted_circle" | "inner_circle";

/** Display labels used in both profile settings and post creation. */
export const VISIBILITY_LABELS: Record<ProfileVisibility | PostVisibility, string> = {
  everyone: "Everyone",
  network: "Everyone",
  trusted_circle: "Trusted circle",
  inner_circle: "Inner circle only",
};

/** Map profile setting to post visibility (e.g. default when creating a post). */
export function profileToPostVisibility(v: ProfileVisibility): PostVisibility {
  if (v === "everyone") return "network";
  return v;
}

/** Map post visibility to profile equivalent for display or comparison. */
export function postToProfileVisibility(v: PostVisibility): ProfileVisibility {
  if (v === "network") return "everyone";
  return v;
}

export type ViewerRelation = "inner" | "trusted" | null;

/** Whether a viewer can see content with the given profile visibility (e.g. profile section). */
export function canSeeProfileSection(
  visibility: ProfileVisibility | undefined,
  viewerRelation: ViewerRelation
): boolean {
  const v = visibility ?? "everyone";
  if (v === "everyone") return true;
  if (v === "trusted_circle") return viewerRelation === "trusted" || viewerRelation === "inner";
  if (v === "inner_circle") return viewerRelation === "inner";
  return false;
}

/** Whether a viewer can see a post with the given post visibility (feed/profile list). */
export function canSeePostVisibility(
  postVisibility: PostVisibility | undefined,
  viewerRelation: ViewerRelation
): boolean {
  const v = postVisibility ?? "network";
  if (v === "network") return true;
  if (v === "trusted_circle") return viewerRelation === "trusted" || viewerRelation === "inner";
  if (v === "inner_circle") return viewerRelation === "inner";
  return false;
}

export const PROFILE_VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string }[] = [
  { value: "everyone", label: VISIBILITY_LABELS.everyone },
  { value: "trusted_circle", label: VISIBILITY_LABELS.trusted_circle },
  { value: "inner_circle", label: VISIBILITY_LABELS.inner_circle },
];

export const POST_VISIBILITY_OPTIONS: { value: PostVisibility; label: string }[] = [
  { value: "network", label: VISIBILITY_LABELS.network },
  { value: "trusted_circle", label: VISIBILITY_LABELS.trusted_circle },
  { value: "inner_circle", label: VISIBILITY_LABELS.inner_circle },
];
