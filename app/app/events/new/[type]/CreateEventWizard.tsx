"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateStepLayout } from "@/components/events/create/CreateStepLayout";
import { BasicsBlock } from "@/components/events/create/BasicsBlock";
import { ExperienceBlock } from "@/components/events/create/ExperienceBlock";
import { GuestsBlock } from "@/components/events/create/GuestsBlock";
import { DescriptionVibeChips } from "@/components/events/create/DescriptionVibeChips";
import { OptionalCoverBlock } from "@/components/events/create/OptionalCoverBlock";
import { CapacityPresets } from "@/components/events/create/CapacityPresets";
import { EliteChip } from "@/components/elite";

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

type FormState = {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
  coverImage: string;
  capacity: number | undefined;
  category: string;
  dressCode: string;
  etiquette: string;
  halalMenuDetails: string;
  prayerFacilityInfo: string;
  visibility: "network" | "invite-only";
  allowGuestRequest: boolean;
  allowBringGuest: boolean;
};

const TOTAL_STEPS = 5;

export function CreateEventWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [form, setForm] = useState<FormState>({
    title: "",
    startAt: "",
    endAt: "",
    location: "",
    description: "",
    coverImage: "",
    capacity: undefined,
    category: "",
    dressCode: "",
    etiquette: "",
    halalMenuDetails: "",
    prayerFacilityInfo: "",
    visibility: "network",
    allowGuestRequest: false,
    allowBringGuest: false,
  });

  const update = (field: keyof FormState, value: string | boolean | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep1 = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.startAt) e.startAt = "Start date and time is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      if (step === 1 && !validateStep1()) return;
      setStep((s) => s + 1);
      return;
    }
    if (!validateStep1()) return;
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          location: form.location.trim() || undefined,
          startAt: form.startAt || undefined,
          endAt: form.endAt || undefined,
          capacity: form.capacity ?? undefined,
          type: "event",
          category: form.category || undefined,
          coverImage: form.coverImage.trim() || undefined,
          visibility: form.visibility,
          dressCode: form.dressCode.trim() || undefined,
          etiquette: form.etiquette.trim() || undefined,
          halalMenuDetails: form.halalMenuDetails.trim() || undefined,
          prayerFacilityInfo: form.prayerFacilityInfo.trim() || undefined,
          allowGuestRequest: form.allowGuestRequest,
          allowBringGuest: form.allowBringGuest,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ title: data.error || "Failed to create event." });
        return;
      }
      router.replace("/app/events?section=my");
      router.refresh();
    } catch {
      setErrors({ title: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else router.push("/app/events/new");
  };

  const stepTitles: Record<number, string> = {
    1: "Basics",
    2: "Details",
    3: "Experience",
    4: "Guests",
    5: "Review",
  };

  return (
    <CreateStepLayout
      title={stepTitles[step]}
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={handleBack}
      nextLabel={step === TOTAL_STEPS ? "Create event" : "Next"}
      onNext={handleNext}
      loading={saving}
    >
      {step === 1 && (
        <BasicsBlock
          values={{
            title: form.title,
            startAt: form.startAt,
            endAt: form.endAt,
            location: form.location,
          }}
          onChange={(field, value) => update(field, value)}
          errors={errors}
          showLocation={true}
          titleSuggestions={EVENT_TITLE_SUGGESTIONS}
        />
      )}

      {step === 2 && (
        <div className="elite-events space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ value, label }) => (
                <EliteChip
                  key={value || "any"}
                  selected={form.category === value}
                  onClick={() => update("category", value)}
                  aria-label={`Category: ${label}`}
                >
                  {label}
                </EliteChip>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
              Description
            </label>
            <DescriptionVibeChips
              value={form.description}
              onChange={(v) => update("description", v)}
            />
          </div>
          <OptionalCoverBlock
            value={form.coverImage}
            onChange={(v) => update("coverImage", v)}
          />
          <CapacityPresets
            value={form.capacity}
            onChange={(v) => update("capacity", v)}
          />
        </div>
      )}

      {step === 3 && (
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
      )}

      {step === 4 && (
        <GuestsBlock
          values={{
            visibility: form.visibility,
            allowGuestRequest: form.allowGuestRequest,
            allowBringGuest: form.allowBringGuest,
          }}
          onChange={(field, value) => update(field, value)}
        />
      )}

      {step === 5 && (
        <div className="elite-events space-y-4 text-sm">
          {errors.title && (
            <p className="text-sm text-[var(--elite-error)]">{errors.title}</p>
          )}
          <p className="font-medium text-[var(--elite-text)]">{form.title || "—"}</p>
          <p className="text-[var(--elite-text-secondary)]">
            {form.startAt ? new Date(form.startAt).toLocaleString() : "—"}
            {form.endAt && ` – ${new Date(form.endAt).toLocaleString()}`}
          </p>
          {form.location && (
            <p className="text-[var(--elite-text-secondary)]">Location: {form.location}</p>
          )}
          {form.description && (
            <p className="text-[var(--elite-text-secondary)] line-clamp-3">{form.description}</p>
          )}
          {form.capacity != null && form.capacity > 0 && (
            <p className="text-[var(--elite-text-secondary)]">Capacity: {form.capacity}</p>
          )}
          <p className="text-[var(--elite-text-secondary)]">
            Visibility: {form.visibility === "invite-only" ? "Invite only" : "Network"}
          </p>
        </div>
      )}
    </CreateStepLayout>
  );
}
