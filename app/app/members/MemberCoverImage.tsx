/** Read-only cover banner — matches profile cover dimensions and styling (no edit UI). */
export function MemberCoverImage({ bannerImage }: { bannerImage?: string | null }) {
  return (
    <div
      className="h-32 sm:h-40 bg-[var(--elite-border-light)]"
      style={{
        backgroundImage: bannerImage ? `url(${bannerImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      role={bannerImage ? "img" : undefined}
      aria-label={bannerImage ? "Cover photo" : undefined}
    />
  );
}
