"use client";

import Link from "next/link";

type EliteAvatarProps = {
  name: string;
  image?: string | null;
  href?: string;
  size?: "sm" | "md" | "lg";
  vip?: boolean;
  className?: string;
  /** Use black gradient for fallback initials (events module) */
  gradientFallback?: boolean;
};

const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };

export function EliteAvatar({
  name,
  image,
  href,
  size = "md",
  vip = false,
  className = "",
  gradientFallback = false,
}: EliteAvatarProps) {
  const fallbackClass = gradientFallback
    ? "flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 text-white font-medium"
    : "flex items-center justify-center w-full h-full rounded-full bg-[var(--elite-border)] text-[var(--elite-text-secondary)] font-medium";

  const content = (
    <>
      <span className="sr-only">{name}</span>
      {image ? (
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className={fallbackClass} style={{ fontFamily: "var(--elite-font-sans)" }}>
          {name?.charAt(0)?.toUpperCase() || "?"}
        </span>
      )}
      {vip && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--elite-accent)] flex items-center justify-center"
          aria-label="VIP"
        >
          <svg className="w-2.5 h-2.5 text-[var(--elite-on-accent)]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </>
  );

  const wrapperClass = `elite-events relative inline-flex shrink-0 rounded-full overflow-hidden ring-2 ${
    vip ? "ring-[var(--elite-accent)]" : gradientFallback ? "ring-neutral-600" : "ring-[var(--elite-border)]"
  } ${sizes[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
