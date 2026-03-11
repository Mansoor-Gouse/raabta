"use client";

import { forwardRef } from "react";
import { trigger } from "@/lib/haptics";

export type HapticType = "light" | "medium" | "success" | "error";

type EliteButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  fullWidth?: boolean;
  ariaLabel?: string;
  /** Haptic feedback on click (light/medium for taps, success/error for outcomes) */
  haptic?: HapticType;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const EliteButton = forwardRef<HTMLButtonElement, EliteButtonProps>(
  (
    {
      children,
      variant = "primary",
      disabled = false,
      loading = false,
      className = "",
      type = "button",
      onClick,
      fullWidth = false,
      ariaLabel,
      haptic,
      ...rest
    },
    ref
  ) => {
    const handleClick = () => {
      if (haptic) trigger(haptic);
      onClick?.();
    };
    const base =
      "elite-events inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-[var(--elite-radius)] text-sm font-medium transition-all duration-[var(--elite-transition)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--elite-bg)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    const variants = {
      primary:
        "bg-[var(--elite-accent)] text-[var(--elite-on-accent)] hover:bg-[var(--elite-accent-hover)] border border-[var(--elite-accent)]",
      secondary:
        "bg-transparent text-[var(--elite-text)] border border-[var(--elite-border)] hover:border-[var(--elite-accent-muted)]",
      ghost:
        "bg-transparent text-[var(--elite-text-secondary)] hover:text-[var(--elite-text)] hover:bg-[var(--elite-border-light)]",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-label={ariaLabel}
        className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...rest}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          children
        )}
      </button>
    );
  }
);
EliteButton.displayName = "EliteButton";
