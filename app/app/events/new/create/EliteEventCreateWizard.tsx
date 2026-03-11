"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreateStepLayout } from "@/components/events/create/CreateStepLayout";
import { QuickTitleChips } from "@/components/events/create/QuickTitleChips";
import { QuickDateChips } from "@/components/events/create/QuickDateChips";
import { LocationChips } from "@/components/events/create/LocationChips";
import { CapacityPresets } from "@/components/events/create/CapacityPresets";
import { OptionalCoverBlock } from "@/components/events/create/OptionalCoverBlock";
import { DescriptionVibeChips } from "@/components/events/create/DescriptionVibeChips";
import { PrayerChips } from "@/components/events/create/PrayerChips";
import { VisibilityChips } from "@/components/events/create/VisibilityChips";
import { HospitalityStyleChips } from "@/components/events/create/HospitalityStyleChips";
import { EliteDressCodeChips } from "@/components/events/create/EliteDressCodeChips";
import { NetworkingIntentChips } from "@/components/events/create/NetworkingIntentChips";
import { EliteCard, EliteChip, EliteInput, EliteButton } from "@/components/elite";
import {
  ELITE_TITLE_SUGGESTIONS_BY_KIND,
  ELITE_DESCRIPTION_SUGGESTIONS_BY_KIND,
  ELITE_CATEGORIES,
  ELITE_CITIES,
  kindToTypeAndCategory,
  type EliteKind,
} from "@/components/events/create/eliteSuggestions";
import { trigger as hapticTrigger } from "@/lib/haptics";
import { MEETING_PLATFORMS, MeetingPlatformIcon } from "@/components/events/meetingPlatforms";

const TOTAL_STEPS = 5;
const STEP_LABELS = ["Basics", "Experience", "Hospitality", "Guests", "Publish"];

const GATHERING_FORMATS = [
  "Strategic Business Discussion",
  "Investment Networking",
  "Philanthropy Planning",
  "Family Social",
  "Leadership Dialogue",
  "Spiritual Reflection",
];

const ATMOSPHERES = [
  "Formal",
  "Elegant",
  "Traditional",
  "Relaxed Majlis",
  "Intellectual",
  "Celebratory",
];

const SPECIAL_GUEST_LABELS = [
  "Guest Scholar",
  "Business Leader",
  "Community Leader",
  "Entrepreneur Speaker",
];

function toDatetimeLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function getTonight(): { startAt: string; endAt: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(19, 0, 0, 0);
  const end = new Date(start);
  end.setHours(22, 0, 0, 0);
  return { startAt: toDatetimeLocal(start), endAt: toDatetimeLocal(end) };
}

function getThisWeekend(): { startAt: string; endAt: string } {
  const now = new Date();
  const day = now.getDay();
  const satOffset = day === 0 ? -6 : 6 - day;
  const sat = new Date(now);
  sat.setDate(now.getDate() + satOffset);
  sat.setHours(10, 0, 0, 0);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(18, 0, 0, 0);
  return { startAt: toDatetimeLocal(sat), endAt: toDatetimeLocal(sun) };
}

function getNextWeek(): { startAt: string; endAt: string } {
  const now = new Date();
  const nextMon = new Date(now);
  nextMon.setDate(now.getDate() + ((8 - now.getDay()) % 7) || 7);
  nextMon.setHours(9, 0, 0, 0);
  const nextFri = new Date(nextMon);
  nextFri.setDate(nextMon.getDate() + 4);
  nextFri.setHours(18, 0, 0, 0);
  return { startAt: toDatetimeLocal(nextMon), endAt: toDatetimeLocal(nextFri) };
}

function getNextMonth(): { startAt: string; endAt: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setHours(18, 0, 0, 0);
  return { startAt: toDatetimeLocal(start), endAt: toDatetimeLocal(end) };
}

function getQuickDateId(startAt: string, endAt: string): string | null {
  if (!startAt || !endAt) return null;
  const w = getThisWeekend();
  if (startAt === w.startAt && endAt === w.endAt) return "weekend";
  const nw = getNextWeek();
  if (startAt === nw.startAt && endAt === nw.endAt) return "nextweek";
  const nm = getNextMonth();
  if (startAt === nm.startAt && endAt === nm.endAt) return "nextmonth";
  return null;
}

type FormState = {
  title: string;
  startAt: string;
  endAt: string;
  eventFormat: "" | "online" | "offline";
  location: string;
  venue: string;
  meetingLink: string;
  meetingDetails: string;
  meetingPlatform: string;
  category: string;
  capacity: number | undefined;
  visibility: "" | "network" | "invite-only";
  allowGuestRequest: boolean;
  allowBringGuest: boolean;
  gatheringFormat: string;
  atmosphere: string;
  dressCode: string;
  description: string;
  halalMenuDetails: string;
  hospitalityStyle: string;
  prayerFacilityInfo: string;
  specialGuestsNote: string;
  coverImage: string;
  networkingIntent: string;
  invitedUserIds: string[];
  inviteInnerCircle: boolean;
  inviteTrustedCircle: boolean;
  audienceType: string;
};

const AUDIENCE_OPTIONS = [
  { value: "", label: "Open" },
  { value: "men-only", label: "Men only" },
  { value: "family", label: "Family" },
  { value: "business", label: "Business professionals" },
  { value: "members-only", label: "Members only" },
] as const;

const defaultFormState: FormState = {
  title: "",
  startAt: "",
  endAt: "",
  eventFormat: "offline",
  location: "",
  venue: "",
  meetingLink: "",
  meetingDetails: "",
  meetingPlatform: "",
  category: "",
  capacity: undefined,
  visibility: "",
  allowGuestRequest: false,
  allowBringGuest: false,
  gatheringFormat: "",
  atmosphere: "",
  dressCode: "",
  description: "",
  halalMenuDetails: "",
  hospitalityStyle: "",
  prayerFacilityInfo: "",
  specialGuestsNote: "",
  coverImage: "",
  networkingIntent: "",
  invitedUserIds: [],
  inviteInnerCircle: false,
  inviteTrustedCircle: false,
  audienceType: "",
};

type EliteEventCreateWizardProps = {
  kind: string;
  hostName?: string;
};

export function EliteEventCreateWizard({ kind, hostName: initialHostName = "Host" }: EliteEventCreateWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [hostName, setHostName] = useState<string>(initialHostName);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<{ _id: string; fullName?: string; name?: string; headline?: string; location?: string }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);

  const safeKind = (["private-gathering", "business-majlis", "philanthropy", "religious", "family", "trip-retreat", "umrah-hajj"] as const).includes(kind as EliteKind)
    ? (kind as EliteKind)
    : "private-gathering";
  const titleSuggestions = ELITE_TITLE_SUGGESTIONS_BY_KIND[safeKind] ?? [];
  const descriptionSuggestions = ELITE_DESCRIPTION_SUGGESTIONS_BY_KIND[safeKind] ?? [];

  useEffect(() => {
    setHostName(initialHostName);
  }, [initialHostName]);

  const { category: kindCategory } = kindToTypeAndCategory(kind);
  useEffect(() => {
    if (kindCategory) {
      setForm((prev) => (prev.category ? prev : { ...prev, category: kindCategory }));
    }
  }, [kindCategory]);

  const update = useCallback((field: keyof FormState, value: string | number | boolean | undefined | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const validateStep1 = useCallback((): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.startAt) e.startAt = "Start date and time is required.";
    if (form.eventFormat !== "offline" && form.eventFormat !== "online") {
      e.eventFormat = "Please select Offline or Online.";
    }
    if (form.visibility !== "network" && form.visibility !== "invite-only") {
      e.visibility = "Please select who can see this event.";
    }
    if (form.eventFormat === "offline") {
      if (!form.location.trim()) e.location = "Location is required for offline events.";
      if (!form.venue.trim()) e.venue = "Venue is required for offline events.";
    } else if (form.eventFormat === "online") {
      if (!form.meetingLink.trim()) e.meetingLink = "Meeting link is required for online events.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form.title, form.startAt, form.eventFormat, form.visibility, form.location, form.venue, form.meetingLink]);

  const handleNext = useCallback(async () => {
    if (step < TOTAL_STEPS) {
      if (step === 1 && !validateStep1()) return;
      hapticTrigger("light");
      setStep((s) => s + 1);
      return;
    }
    if (!validateStep1()) return;
    setSaving(true);
    setErrors({});
    const { type, category } = kindToTypeAndCategory(kind);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
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
          capacity: form.capacity ?? undefined,
          type,
          category: category || form.category || undefined,
          coverImage: form.coverImage.trim() || undefined,
          visibility: form.visibility || "invite-only",
          allowGuestRequest: form.allowGuestRequest,
          allowBringGuest: form.allowBringGuest,
          dressCode: form.dressCode.trim() || undefined,
          etiquette: form.atmosphere.trim() || undefined,
          halalMenuDetails: form.halalMenuDetails.trim() || undefined,
          prayerFacilityInfo: form.prayerFacilityInfo.trim() || undefined,
          gatheringFormat: form.gatheringFormat.trim() || undefined,
          atmosphere: form.atmosphere.trim() || undefined,
          hospitalityStyle: form.hospitalityStyle.trim() || undefined,
          specialGuestsNote: form.specialGuestsNote.trim() || undefined,
          networkingIntent: form.networkingIntent.trim() || undefined,
          invitedUserIds: form.invitedUserIds.length > 0 ? form.invitedUserIds : undefined,
          inviteInnerCircle: form.inviteInnerCircle || undefined,
          inviteTrustedCircle: form.inviteTrustedCircle || undefined,
          audienceType:
            form.audienceType && ["open", "men-only", "family", "business", "members-only"].includes(form.audienceType)
              ? form.audienceType
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ title: data.error || "Failed to create event." });
        return;
      }
      hapticTrigger("success");
      router.replace("/app/events?section=my");
      router.refresh();
    } catch {
      setErrors({ title: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }, [step, form, kind, validateStep1, router]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      hapticTrigger("light");
      setStep((s) => s - 1);
    } else {
      router.push("/app/events/new");
    }
  }, [step, router]);

  const tonight = getTonight();
  const isTonightSelected = form.startAt === tonight.startAt && form.endAt === tonight.endAt;

  const stepTitles: Record<number, string> = {
    1: "Event Basics",
    2: "Experience & Atmosphere",
    3: "Hospitality & Religious Needs",
    4: "Guest Curation",
    5: "Preview & Publish",
  };

  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setMemberSearchResults([]);
      return;
    }
    setMemberSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=users&limit=15`, { credentials: "include" });
      const data = await res.json();
      setMemberSearchResults(Array.isArray(data.users) ? data.users : []);
    } catch {
      setMemberSearchResults([]);
    } finally {
      setMemberSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchMembers(memberSearchQuery), 300);
    return () => clearTimeout(t);
  }, [memberSearchQuery, searchMembers]);

  const addInvite = useCallback((userId: string) => {
    if (form.invitedUserIds.includes(userId)) return;
    setForm((prev) => ({ ...prev, invitedUserIds: [...prev.invitedUserIds, userId] }));
  }, [form.invitedUserIds]);

  const removeInvite = useCallback((userId: string) => {
    setForm((prev) => ({ ...prev, invitedUserIds: prev.invitedUserIds.filter((id) => id !== userId) }));
  }, []);

  return (
    <CreateStepLayout
      title={stepTitles[step]}
      step={step}
      totalSteps={TOTAL_STEPS}
      stepLabels={STEP_LABELS}
      onBack={handleBack}
      nextLabel={step === TOTAL_STEPS ? "Publish Event" : "Next"}
      onNext={handleNext}
      loading={saving}
    >
      <div key={step} className="create-step-content">
        <div className="elite-events elite-hover-lift rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-surface)] p-4 md:p-6 transition-shadow duration-200">
        {step === 1 && (
          <div className="space-y-5">
            <div className="create-form-section">
              {titleSuggestions.length > 0 && (
                <QuickTitleChips
                  value={form.title}
                  onChange={(v) => update("title", v)}
                  suggestions={titleSuggestions}
                />
              )}
              <EliteInput
                label="Event title *"
                placeholder="e.g. Private Business Majlis"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                error={errors.title}
              />
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {ELITE_CATEGORIES.map(({ value, label }) => (
                  <EliteChip
                    key={value}
                    selected={form.category === value}
                    onClick={() => {
                      hapticTrigger("light");
                      update("category", form.category === value ? "" : value);
                    }}
                  >
                    {label}
                  </EliteChip>
                ))}
              </div>
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Date</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <EliteChip
                  selected={isTonightSelected}
                  onClick={() => {
                    hapticTrigger("light");
                    if (isTonightSelected) {
                      update("startAt", "");
                      update("endAt", "");
                    } else {
                      update("startAt", tonight.startAt);
                      update("endAt", tonight.endAt);
                    }
                  }}
                  aria-label={isTonightSelected ? "Clear Tonight" : "Set to Tonight"}
                >
                  Tonight
                </EliteChip>
                <QuickDateChips
                  selectedId={getQuickDateId(form.startAt, form.endAt)}
                  onSelect={(startAt, endAt) => {
                    update("startAt", startAt);
                    update("endAt", endAt);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EliteInput
                  label="Start *"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => update("startAt", e.target.value)}
                  error={errors.startAt}
                />
                <EliteInput
                  label="End"
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => update("endAt", e.target.value)}
                />
              </div>
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Event format</label>
              {errors.eventFormat && (
                <p className="text-sm text-[var(--elite-error)] mb-1">{errors.eventFormat}</p>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                <EliteChip
                  selected={form.eventFormat === "offline"}
                  onClick={() => {
                    hapticTrigger("light");
                    update("eventFormat", form.eventFormat === "offline" ? "" : "offline");
                  }}
                >
                  Offline
                </EliteChip>
                <EliteChip
                  selected={form.eventFormat === "online"}
                  onClick={() => {
                    hapticTrigger("light");
                    update("eventFormat", form.eventFormat === "online" ? "" : "online");
                  }}
                >
                  Online
                </EliteChip>
              </div>
              {form.eventFormat === "offline" ? (
                <>
                  <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Location *</label>
                  <LocationChips
                    value={form.location}
                    onChange={(v) => update("location", v)}
                    options={ELITE_CITIES}
                    otherPlaceholder="City"
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-[var(--elite-error)]">{errors.location}</p>
                  )}
                  <EliteInput
                    label="Venue *"
                    placeholder="e.g. Taj Falaknuma Palace"
                    value={form.venue}
                    onChange={(e) => update("venue", e.target.value)}
                    error={errors.venue}
                  />
                </>
              ) : form.eventFormat === "online" ? (
                <>
                  <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Platform</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {MEETING_PLATFORMS.map((platform) => (
                      <EliteChip
                        key={platform.id}
                        selected={form.meetingPlatform === platform.id}
                        onClick={() => {
                          hapticTrigger("light");
                          update("meetingPlatform", form.meetingPlatform === platform.id ? "" : platform.id);
                        }}
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
            </div>
            <div className="create-form-section">
              <CapacityPresets value={form.capacity} onChange={(v) => update("capacity", v)} />
            </div>
            <div className="create-form-section">
              {errors.visibility && (
                <p className="text-sm text-[var(--elite-error)] mb-1">{errors.visibility}</p>
              )}
            <VisibilityChips
              visibility={form.visibility}
              allowGuestRequest={form.allowGuestRequest}
              onChange={(visibility, allowGuestRequest) => {
                update("visibility", visibility);
                update("allowGuestRequest", allowGuestRequest);
              }}
            />
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Audience (optional)</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <EliteChip
                    key={opt.value || "open"}
                    selected={form.audienceType === opt.value}
                    onClick={() => {
                      hapticTrigger("light");
                      update("audienceType", form.audienceType === opt.value ? "" : opt.value);
                    }}
                  >
                    {opt.label}
                  </EliteChip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Gathering format</label>
              <div className="flex flex-wrap gap-2">
                {GATHERING_FORMATS.map((opt) => (
                  <EliteChip
                    key={opt}
                    selected={form.gatheringFormat === opt}
                    onClick={() => {
                      hapticTrigger("light");
                      update("gatheringFormat", form.gatheringFormat === opt ? "" : opt);
                    }}
                  >
                    {opt}
                  </EliteChip>
                ))}
              </div>
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Event atmosphere</label>
              <div className="flex flex-wrap gap-2">
                {ATMOSPHERES.map((opt) => (
                  <EliteChip
                    key={opt}
                    selected={form.atmosphere === opt}
                    onClick={() => {
                      hapticTrigger("light");
                      update("atmosphere", form.atmosphere === opt ? "" : opt);
                    }}
                  >
                    {opt}
                  </EliteChip>
                ))}
              </div>
            </div>
            <div className="create-form-section">
              <EliteDressCodeChips value={form.dressCode} onChange={(v) => update("dressCode", v)} />
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Description</label>
              {descriptionSuggestions.length > 0 && (
                <DescriptionVibeChips
                  value={form.description}
                  onChange={(v) => update("description", v)}
                  vibes={descriptionSuggestions.map((text) => ({ value: text, label: text.slice(0, 40) + (text.length > 40 ? "…" : "") }))}
                />
              )}
              <EliteInput
                label="Description"
                placeholder="Describe your gathering"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="create-form-section">
              <HospitalityStyleChips value={form.hospitalityStyle} onChange={(v) => update("hospitalityStyle", v)} />
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Prayer facilities</label>
              <PrayerChips value={form.prayerFacilityInfo} onChange={(v) => update("prayerFacilityInfo", v)} />
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Special guests</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {SPECIAL_GUEST_LABELS.map((opt) => (
                  <EliteChip
                    key={opt}
                    selected={form.specialGuestsNote === opt}
                    onClick={() => {
                      hapticTrigger("light");
                      update("specialGuestsNote", form.specialGuestsNote === opt ? "" : opt);
                    }}
                  >
                    {opt}
                  </EliteChip>
                ))}
              </div>
              <EliteInput
                placeholder="e.g. Guest Scholar: Islamic finance expert"
                value={form.specialGuestsNote}
                onChange={(e) => update("specialGuestsNote", e.target.value)}
              />
            </div>
            <div className="create-form-section">
              <OptionalCoverBlock value={form.coverImage} onChange={(v) => update("coverImage", v)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="create-form-section">
              <p className="text-sm font-medium text-[var(--elite-text-secondary)] mb-1">Invitation mode</p>
              <p className="text-sm text-[var(--elite-text-muted)]">
                {form.visibility === "invite-only" && !form.allowGuestRequest && "Invite Only"}
                {form.visibility === "network" && "Network Members"}
                {form.visibility === "invite-only" && form.allowGuestRequest && "Invite + Request"}
                {form.visibility !== "network" && form.visibility !== "invite-only" && "Not set"}
              </p>
            </div>
            <div className="create-form-section">
              <p className="text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Invite from your circles</p>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={form.inviteInnerCircle}
                  onChange={(e) => update("inviteInnerCircle", e.target.checked)}
                  className="rounded border-[var(--elite-border)] text-[var(--elite-accent)] focus:ring-[var(--elite-accent)]"
                />
                <span className="text-sm text-[var(--elite-text)]">Invite Inner Circle first</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.inviteTrustedCircle}
                  onChange={(e) => update("inviteTrustedCircle", e.target.checked)}
                  className="rounded border-[var(--elite-border)] text-[var(--elite-accent)] focus:ring-[var(--elite-accent)]"
                />
                <span className="text-sm text-[var(--elite-text)]">Invite Trusted Circle</span>
              </label>
              <p className="text-xs text-[var(--elite-text-muted)] mt-1">
                Your circle members will receive an invitation when you publish.
              </p>
            </div>
            <div className="create-form-section">
              <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">Invite members</label>
              <EliteInput
                placeholder="Search by name, city, profession..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
              />
              {memberSearchLoading && <p className="text-xs text-[var(--elite-text-muted)] mt-1">Searching…</p>}
              {memberSearchResults.length > 0 && (
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {memberSearchResults.map((u) => {
                    const id = u._id;
                    const name = u.fullName || u.name || "Member";
                    const added = form.invitedUserIds.includes(id);
                    return (
                      <li key={id} className="flex items-center justify-between gap-2 py-2 border-b border-[var(--elite-border)] last:border-0">
                        <span className="text-sm text-[var(--elite-text)] truncate">
                          {name}
                          {u.headline && <span className="text-[var(--elite-text-muted)]"> · {u.headline}</span>}
                          {u.location && <span className="text-[var(--elite-text-muted)]"> · {u.location}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => (added ? removeInvite(id) : addInvite(id))}
                          className="shrink-0 text-sm font-medium text-[var(--elite-accent)] hover:underline"
                        >
                          {added ? "Remove" : "Invite"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {form.invitedUserIds.length > 0 && (
                <p className="text-xs text-[var(--elite-text-muted)] mt-2">
                  {form.invitedUserIds.length} member(s) invited
                </p>
              )}
            </div>
            <div className="create-form-section">
              <NetworkingIntentChips value={form.networkingIntent} onChange={(v) => update("networkingIntent", v)} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            {errors.title && (
              <p className="text-sm text-[var(--elite-error)]">{errors.title}</p>
            )}
            <EliteCard className="overflow-hidden p-0" as="div">
              {form.coverImage ? (
                <div className="aspect-[3/2] w-full relative bg-[var(--elite-border)]">
                  <img src={form.coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[3/2] w-full bg-gradient-to-br from-neutral-500 to-neutral-700" />
              )}
              <div className="p-4 space-y-2">
                <h2 className="elite-heading text-xl font-semibold text-[var(--elite-text)]">
                  {form.title || "—"}
                </h2>
                <p className="text-sm text-[var(--elite-text-muted)]">Hosted by: {hostName}</p>
                <p className="text-sm text-[var(--elite-text-secondary)]">
                  {form.eventFormat === "online"
                    ? (form.meetingLink
                        ? (form.meetingPlatform ? MEETING_PLATFORMS.find((p) => p.id === form.meetingPlatform)?.label + " · " : "Online · ") + form.meetingLink
                        : "Online —")
                    : [form.venue, form.location].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-sm text-[var(--elite-text-secondary)]">
                  {form.startAt ? new Date(form.startAt).toLocaleString() : "—"}
                </p>
                {form.dressCode && (
                  <p className="text-xs text-[var(--elite-text-muted)]">Dress: {form.dressCode}</p>
                )}
                {form.prayerFacilityInfo && (
                  <p className="text-xs text-[var(--elite-text-muted)]">Prayer: {form.prayerFacilityInfo}</p>
                )}
                <p className="text-xs text-[var(--elite-text-muted)]">
                  Guests: {form.invitedUserIds.length} invited
                </p>
              </div>
            </EliteCard>
          </div>
        )}
        </div>
      </div>
    </CreateStepLayout>
  );
}
