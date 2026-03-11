"use client";

import { forwardRef } from "react";

type EliteCardProps = {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  as?: "div" | "article" | "section";
};

export const EliteCard = forwardRef<HTMLDivElement, EliteCardProps>(
  ({ children, className = "", accent = false, as: Component = "div" }, ref) => {
    return (
      <Component
        ref={ref as React.RefObject<HTMLDivElement>}
        className={`elite-events rounded-[var(--elite-radius-lg)] border bg-[var(--elite-card)] dark:bg-[var(--elite-surface)] p-5 md:p-6 transition-all duration-[var(--elite-transition)] hover:border-[var(--elite-accent-muted)]/50 ${
          accent
            ? "border-[var(--elite-accent)] shadow-[var(--elite-shadow)]"
            : "border-[var(--elite-border)] hover:shadow-[var(--elite-shadow)]"
        } ${className}`}
      >
        {children}
      </Component>
    );
  }
);
EliteCard.displayName = "EliteCard";
