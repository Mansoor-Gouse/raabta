"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trigger } from "@/lib/haptics";
import { BasicsBlock } from "@/components/events/create/BasicsBlock";
import { EliteInput } from "@/components/elite";
import { DescriptionVibeChips } from "@/components/events/create/DescriptionVibeChips";
import { OptionalCoverBlock } from "@/components/events/create/OptionalCoverBlock";
import { CapacityPresets } from "@/components/events/create/CapacityPresets";
import { ExperienceBlock } from "@/components/events/create/ExperienceBlock";
import { GuestsBlock } from "@/components/events/create/GuestsBlock";
import { EliteCard, EliteButton, EliteChip } from "@/components/elite";
import { MEETING_PLATFORMS, MeetingPlatformIcon } from "@/components/events/meetingPlatforms";

const EVENT_TITLE_SUGGESTIONS = [
  "Annual Gala",
  "Iftar Dinner",
  "Networking Brunch",
  "Family Day",
  "Charity Evening",
  "Members Lunch",
];

const CATEGORIES = [
  { value: "", label: "Any" },
  { value: "business", label: "Business" },
  { value: "philanthropy", label: "Philanthropy" },
  { value: "family", label: "Family" },
  { value: "religious", label: "Religious" },
  { value: "luxury-trips", label: "Curated Trips" },
  { value: "education", label: "Education" },
] as const;

const AUDIENCE_TYPES = [
  { value: "", label: "Any" },
  { value: "open", label: "Open" },
  { value: "men-only", label: "Men only" },
  { value: "family", label: "Family" },
  { value: "business", label: "Business" },
  { value: "members-only", label: "Members only" },
] as const;

export type InitialData = {
  eventId: string;
  title: string;
  description: string;
  location: string;
  venue: string;
  eventFormat: "" | "online" | "offline";
  meetingLink: string;
  meetingDetails: string;
  meetingPlatform: string;
  startAt: string;
  endAt: string;
  capacity?: number;
  coverImage: string;
  visibility: "network" | "invite-only";
  category: string;
  dressCode: string;
  etiquette: string;
  halalMenuDetails: string;
  prayerFacilityInfo: string;
  allowGuestRequest: boolean;
  allowBringGuest: boolean;
  audienceType: string;
};

type EliteEventEditClientProps = {
  initial: InitialData;
};

export function EliteEventEditClient({ initial }: EliteEventEditClientProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const update = (field: keyof InitialData, value: string | number | boolean | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
  };

  const validate = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.startAt) e.startAt = "Start date and time is required.";
    if (form.eventFormat !== "offline" && form.eventFormat !== "online") {
      e.eventFormat = "Please select Offline or Online.";
    }
    if (form.eventFormat === "offline") {
      if (!form.location.trim()) e.location = "Location is required for offline events.";
      if (!form.venue.trim()) e.venue = "Venue is required for offline events.";
    } else if (form.eventFormat === "online") {
      if (!form.meetingLink.trim()) e.meetingLink = "Meeting link is required for online events.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        eventFormat: form.eventFormat === "online" || form.eventFormat === "offline" ? form.eventFormat : "offline",
        location: form.eventFormat === "offline" ? form.location.trim() || undefined : undefined,
        venue: form.eventFormat === "offline" ? form.venue.trim() || undefined : undefined,
        meetingLink: form.eventFormat === "online" ? form.meetingLink.trim() || undefined : undefined,
        meetingDetails: form.eventFormat === "online" ? form.meetingDetails.trim() || undefined : undefined,
        meetingPlatform: form.eventFormat === "online" && form.meetingPlatform ? form.meetingPlatform : undefined,
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
        capacity: form.capacity,
        coverImage: form.coverImage.trim() || undefined,
        visibility: form.visibility,
        category: form.category || undefined,
        dressCode: form.dressCode.trim() || undefined,
        etiquette: form.etiquette.trim() || undefined,
        halalMenuDetails: form.halalMenuDetails.trim() || undefined,
        prayerFacilityInfo: form.prayerFacilityInfo.trim() || undefined,
        allowGuestRequest: form.allowGuestRequest,
        allowBringGuest: form.allowBringGuest,
        audienceType: form.audienceType || undefined,
      };
      const res = await fetch(`/api/events/${initial.eventId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || data?.message || "Failed to update event.");
        trigger("error");
        return;
      }
      trigger("success");
      router.push(`/app/events/${initial.eventId}`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="elite-events min-h-screen bg-[var(--elite-bg)] flex flex-col">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] transition-colors duration-[var(--elite-transition)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <Link
          href={`/app/events/${initial.eventId}/host`}
          className="p-2 -ml-2 rounded-lg text-[var(--elite-text)] hover:bg-[var(--elite-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)]">Edit event</h1>
      </header>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-6"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        {error && (
          <div
            className="rounded-[var(--elite-radius)] px-4 py-3 text-sm text-white bg-[var(--elite-error,#ed4956)]"
            role="alert"
          >
            {error}
            <button type="button" className="ml-2 inline-flex items-center gap-1 rounded p-1 hover:bg-white/20" onClick={() => setError(null)} aria-label="Dismiss">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Dismiss
            </button>
          </div>
        )}

        <EliteCard>
          <BasicsBlock
            values={{
              title: form.title,
              startAt: form.startAt,
              endAt: form.endAt,
              location: form.location,
            }}
            onChange={(field, value) => update(field, value)}
            errors={errors}
            showLocation={form.eventFormat === "offline"}
            titleSuggestions={EVENT_TITLE_SUGGESTIONS}
          />
        </EliteCard>

        <EliteCard>
          <p className="text-sm font-medium text-[var(--elite-text-secondary)] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--elite-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            Event format & place
          </p>
          {errors.eventFormat && (
            <p className="text-sm text-[var(--elite-error)] mb-1">{errors.eventFormat}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            <EliteChip
              selected={form.eventFormat === "offline"}
              onClick={() => update("eventFormat", form.eventFormat === "offline" ? "" : "offline")}
            >
              Offline
            </EliteChip>
            <EliteChip
              selected={form.eventFormat === "online"}
              onClick={() => update("eventFormat", form.eventFormat === "online" ? "" : "online")}
            >
              Online
            </EliteChip>
          </div>
          {form.eventFormat === "offline" ? (
            <EliteInput
              label="Venue *"
              placeholder="e.g. Taj Falaknuma Palace"
              value={form.venue}
              onChange={(e) => update("venue", e.target.value)}
              error={errors.venue}
            />
          ) : form.eventFormat === "online" ? (
            <>
              <p className="text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Platform</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {MEETING_PLATFORMS.map((platform) => (
                  <EliteChip
                    key={platform.id}
                    selected={form.meetingPlatform === platform.id}
                    onClick={() => update("meetingPlatform", form.meetingPlatform === platform.id ? "" : platform.id)}
                    className="inline-flex items-center gap-1.5"
                  >
                    <MeetingPlatformIcon platformId={platform.id} className="w-4 h-4 shrink-0" />
                    {platform.label}
                  </EliteChip>
                ))}
              </div>
              <EliteInput
                label="Meeting link *"
                placeholder="e.g. https://zoom.us/j/..."
                value={form.meetingLink}
                onChange={(e) => update("meetingLink", e.target.value)}
                error={errors.meetingLink}
              />
              <EliteInput
                label="Meeting details (optional)"
                placeholder="e.g. Join via Zoom. Link shared 24h before."
                value={form.meetingDetails}
                onChange={(e) => update("meetingDetails", e.target.value)}
                className="mt-3"
              />
            </>
          ) : (
            <p className="text-sm text-[var(--elite-text-muted)]">Select Offline or Online above.</p>
          )}
        </EliteCard>

        <EliteCard>
          <p className="text-sm font-medium text-[var(--elite-text-secondary)] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ value, label }) => (
              <EliteChip
                key={value || "any"}
                selected={form.category === value}
                onClick={() => update("category", value)}
              >
                {label}
              </EliteChip>
            ))}
          </div>
        </EliteCard>

        <EliteCard>
          <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Description</label>
          <DescriptionVibeChips value={form.description} onChange={(v) => update("description", v)} />
        </EliteCard>

        <EliteCard>
          <OptionalCoverBlock value={form.coverImage} onChange={(v) => update("coverImage", v)} />
        </EliteCard>

        <EliteCard>
          <p className="text-sm font-medium text-[var(--elite-text-secondary)] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Capacity
          </p>
          <CapacityPresets value={form.capacity} onChange={(v) => update("capacity", v)} />
        </EliteCard>

        <EliteCard>
          <ExperienceBlock
            values={{
              dressCode: form.dressCode,
              etiquette: form.etiquette,
              halalMenuDetails: form.halalMenuDetails,
              prayerFacilityInfo: form.prayerFacilityInfo,
            }}
            onChange={(field, value) => update(field, value)}
            showDressCode={true}
          />
        </EliteCard>

        <EliteCard>
          <p className="text-sm font-medium text-[var(--elite-text-secondary)] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Audience
          </p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_TYPES.map(({ value, label }) => (
              <EliteChip
                key={value || "any"}
                selected={form.audienceType === value}
                onClick={() => update("audienceType", value)}
              >
                {label}
              </EliteChip>
            ))}
          </div>
        </EliteCard>

        <EliteCard>
          <GuestsBlock
            values={{
              visibility: form.visibility,
              allowGuestRequest: form.allowGuestRequest,
              allowBringGuest: form.allowBringGuest,
            }}
            onChange={(field, value) => update(field, value)}
          />
        </EliteCard>
      </div>

      <footer
        className="sticky bottom-0 z-10 flex items-center gap-3 px-4 py-3 border-t border-[var(--elite-border)] bg-[var(--elite-bg)]"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <EliteButton
          variant="primary"
          fullWidth
          haptic="medium"
          onClick={handleSave}
          disabled={saving}
          loading={saving}
          className="inline-flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {saving ? "Saving…" : "Save changes"}
        </EliteButton>
      </footer>
    </div>
  );
}
