"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

const SECTIONS = ["posts", "events"] as const;
export type MemberCarouselSection = (typeof SECTIONS)[number];

type Props = {
  userId: string;
  section: MemberCarouselSection;
  children: ReactNode;
};

/**
 * Horizontal swipe on the content area to switch between Posts and Events (member profile).
 */
export function MemberSectionCarousel({ userId, section, children }: Props) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const idx = SECTIONS.indexOf(section);
  const base = `/app/members/${userId}`;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 56) return;
    // Swipe left → next tab (posts → events)
    if (dx < 0 && idx < SECTIONS.length - 1) {
      router.push(`${base}/events`);
    } else if (dx > 0 && idx > 0) {
      // Swipe right → previous (events → posts)
      router.push(base);
    }
  };

  return (
    <div className="touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  );
}
