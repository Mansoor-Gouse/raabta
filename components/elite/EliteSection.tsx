"use client";

import Link from "next/link";

type EliteSectionProps = {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: React.ReactNode;
  className?: string;
};

export function EliteSection({
  title,
  seeAllHref,
  seeAllLabel = "See all",
  children,
  className = "",
}: EliteSectionProps) {
  return (
    <section className={`elite-events ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="elite-heading text-lg md:text-xl font-semibold tracking-tight text-[var(--elite-text)]">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm font-medium text-[var(--elite-accent)] hover:text-[var(--elite-accent-hover)] transition-colors"
          >
            {seeAllLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
