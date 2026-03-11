"use client";

import Link from "next/link";
import { EliteButton } from "@/components/elite";
import { trigger as hapticTrigger } from "@/lib/haptics";

type CreateStepLayoutProps = {
  title: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
  nextLabel: string;
  onNext: () => void;
  loading?: boolean;
  /** Optional step names for subtitle e.g. "1 / 5 Basics" */
  stepLabels?: string[];
  children: React.ReactNode;
};

export function CreateStepLayout({
  title,
  step,
  totalSteps,
  onBack,
  nextLabel,
  onNext,
  loading = false,
  stepLabels,
  children,
}: CreateStepLayoutProps) {
  const stepSubtitle = stepLabels && stepLabels[step - 1]
    ? `${step} / ${totalSteps} ${stepLabels[step - 1]}`
    : `Step ${step} of ${totalSteps}`;
  const isPublish = nextLabel.toLowerCase().includes("publish") || nextLabel.toLowerCase().includes("create");
  return (
    <div className="elite-events min-h-screen min-h-[100dvh] bg-[var(--elite-bg)] flex flex-col">
      <header
        className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)]"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => {
            hapticTrigger("light");
            onBack();
          }}
          className="elite-press p-2 -ml-2 rounded-lg text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="elite-heading text-lg font-semibold text-[var(--elite-text)] truncate">
            {title}
          </h1>
          <p className="text-xs text-[var(--elite-text-secondary)]">
            {stepSubtitle}
          </p>
        </div>
      </header>

      {/* Progress bar segments */}
      <div className="shrink-0 px-4 pt-3 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`create-progress-segment h-1.5 flex-1 rounded-full ${
              i + 1 <= step
                ? "bg-[var(--elite-accent)] scale-100"
                : "bg-[var(--elite-border-light)]"
            }`}
            aria-hidden
          />
        ))}
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 md:py-6"
        style={{ paddingBottom: "calc(4rem + 56px + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </div>

      <footer
        className="shrink-0 border-t border-[var(--elite-border)] bg-[var(--elite-bg)] px-4 py-3 flex flex-row items-center justify-between gap-3 fixed bottom-0 left-0 right-0 z-10"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <Link
          href="/app/events"
          className="elite-events inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[var(--elite-radius)] text-sm font-medium text-[var(--elite-text-secondary)] hover:text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)]"
          aria-label="Cancel"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </Link>
        <EliteButton
          type="button"
          variant="primary"
          onClick={onNext}
          loading={loading}
          disabled={loading}
          ariaLabel={nextLabel}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5"
        >
          {loading ? null : isPublish ? (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          )}
          {nextLabel}
        </EliteButton>
      </footer>
    </div>
  );
}
