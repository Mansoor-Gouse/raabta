"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ChannelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ChannelErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 bg-[var(--ig-bg-primary)]">
          <p className="text-[var(--ig-text)] font-medium">Something went wrong</p>
          <p className="text-sm text-[var(--ig-text-secondary)] text-center max-w-sm">
            This chat could not be loaded. Go back to your conversations and try again.
          </p>
          <Link
            href="/app/chats"
            className="px-4 py-2 rounded-lg bg-[var(--ig-text)] text-[var(--ig-bg-primary)] font-medium hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)] focus-visible:ring-offset-2"
          >
            Back to chats
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
