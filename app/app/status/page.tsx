"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Status list page removed: view and add stories from the feed story bar.
 * Redirect to feed where the story bar lives.
 */
export default function StatusPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/feed");
  }, [router]);
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[var(--ig-text-secondary)]">Redirecting…</p>
    </div>
  );
}
