"use client";

import { trigger } from "@/lib/haptics";

type EliteChipProps = {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  as?: "button" | "span";
  disabled?: boolean;
  /** Light haptic on click when not disabled */
  haptic?: "light";
};

export function EliteChip({
  children,
  selected = false,
  onClick,
  className = "",
  as: Component = "button",
  disabled = false,
  haptic,
}: EliteChipProps) {
  const base =
    "elite-events inline-flex items-center justify-center h-8 min-h-[32px] px-3 rounded-full text-xs font-medium tracking-tight transition-all duration-150 shrink-0 active:scale-[0.97]";
  const selectedStyles =
    "elite-accent-gradient-bg text-[var(--elite-on-accent)] border border-[var(--elite-accent)]";
  const unselectedStyles =
    "bg-transparent text-[var(--elite-text-secondary)] border border-[var(--elite-border)] hover:border-[var(--elite-accent-muted)] hover:text-[var(--elite-text)]";
  const disabledStyles = "opacity-60 pointer-events-none cursor-not-allowed";

  const handleClick = () => {
    if (!disabled && haptic) trigger("light");
    onClick?.();
  };

  if (Component === "span") {
    return (
      <span
        className={`${base} ${selected ? selectedStyles : unselectedStyles} ${disabled ? disabledStyles : ""} ${className}`}
      >
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`${base} ${selected ? selectedStyles : unselectedStyles} ${disabled ? disabledStyles : ""} ${className}`}
    >
      {children}
    </button>
  );
}
