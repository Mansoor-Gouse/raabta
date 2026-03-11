"use client";

import { forwardRef } from "react";

type EliteInputProps = {
  label?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const EliteInput = forwardRef<HTMLInputElement, EliteInputProps>(
  ({ label, error, className = "", id, ...rest }, ref) => {
    const inputId = id || `elite-input-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="elite-events">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-[38px] rounded-[var(--elite-radius)] border bg-[var(--elite-surface)] px-2.5 py-2 text-sm text-[var(--elite-text)] placeholder-[var(--elite-text-muted)] transition-colors duration-[var(--elite-transition)] focus:outline-none focus:ring-2 focus:ring-[var(--elite-accent)] focus:border-transparent ${
            error ? "border-[var(--elite-error)]" : "border-[var(--elite-border)]"
          } ${className}`}
          {...rest}
        />
        {error && (
          <p className="mt-1 text-sm text-[var(--elite-error)]">{error}</p>
        )}
      </div>
    );
  }
);
EliteInput.displayName = "EliteInput";
