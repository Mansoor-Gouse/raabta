"use client";

/** Supported meeting platform IDs for online events */
export const MEETING_PLATFORM_IDS = ["zoom", "google-meet", "teams", "webex", "other"] as const;
export type MeetingPlatformId = (typeof MEETING_PLATFORM_IDS)[number];

export type MeetingPlatform = {
  id: MeetingPlatformId;
  label: string;
};

export const MEETING_PLATFORMS: MeetingPlatform[] = [
  { id: "zoom", label: "Zoom" },
  { id: "google-meet", label: "Google Meet" },
  { id: "teams", label: "Microsoft Teams" },
  { id: "webex", label: "Webex" },
  { id: "other", label: "Other" },
];

export function getMeetingPlatform(id: string | undefined): MeetingPlatform | undefined {
  if (!id) return undefined;
  return MEETING_PLATFORMS.find((p) => p.id === id);
}

/** Platform-specific icons (simplified brand-style shapes for recognition) */

// Zoom: official blue #2D8CFF, rounded square with white camera/lens
function ZoomIcon({ className, ariaHidden }: { className?: string; ariaHidden?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden={ariaHidden}>
      <rect width="24" height="24" rx="5" fill="#2D8CFF" />
      <path fill="white" d="M7 9a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 01-1 1H8a1 1 0 01-1-1V9z" />
      <circle cx="12" cy="12" r="2.5" fill="#2D8CFF" />
    </svg>
  );
}

// Google Meet: official green #00AC47, video camera shape
function GoogleMeetIcon({ className, ariaHidden }: { className?: string; ariaHidden?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden={ariaHidden}>
      <path fill="#00AC47" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path fill="white" d="M8 8a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2v-4a2 2 0 00-2-2H8zm4 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  );
}

// Microsoft Teams: purple with white “T”
function TeamsIcon({ className, ariaHidden }: { className?: string; ariaHidden?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden={ariaHidden}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        fill="#6264A7"
      />
      <path fill="white" d="M14 7h-4v10h2v-4h2v-2h-2V7zm-2 0H8v2h2V7z" />
    </svg>
  );
}

// Cisco Webex: blue #2680EB, video camera
function WebexIcon({ className, ariaHidden }: { className?: string; ariaHidden?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden={ariaHidden}>
      <path fill="#2680EB" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path fill="white" d="M8 8a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2v-4a2 2 0 00-2-2H8zm6 4l3-2v4l-3-2z" />
    </svg>
  );
}

// Other: generic video camera (stroke)
function OtherPlatformIcon({ className, ariaHidden }: { className?: string; ariaHidden?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={ariaHidden}>
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

/** Icon component for meeting platforms */
export function MeetingPlatformIcon({
  platformId,
  className = "w-5 h-5",
  ariaHidden = true,
}: {
  platformId: string | undefined;
  className?: string;
  ariaHidden?: boolean;
}) {
  const p = platformId?.toLowerCase();
  const props = { className, ariaHidden };
  if (p === "zoom") return <ZoomIcon {...props} />;
  if (p === "google-meet") return <GoogleMeetIcon {...props} />;
  if (p === "teams") return <TeamsIcon {...props} />;
  if (p === "webex") return <WebexIcon {...props} />;
  return <OtherPlatformIcon {...props} />;
}
