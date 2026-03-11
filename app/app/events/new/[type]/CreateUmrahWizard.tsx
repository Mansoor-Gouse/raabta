"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateStepLayout } from "@/components/events/create/CreateStepLayout";
import { BasicsBlock } from "@/components/events/create/BasicsBlock";
import { GuestsBlock } from "@/components/events/create/GuestsBlock";
import { DescriptionVibeChips } from "@/components/events/create/DescriptionVibeChips";
import { PrayerChips } from "@/components/events/create/PrayerChips";

const UMRAH_TITLE_SUGGESTIONS = [
  "Umrah Group",
  "Umrah Journey",
  "Spiritual Umrah",
  "Family Umrah",
  "Umrah with the Community",
];

const UMRAH_LOCATION_OPTIONS = [
  "Makkah",
  "Madinah",
  "Jeddah",
  "Riyadh",
  "To be confirmed",
];

const UMRAH_VIBES = [
  { value: "A guided Umrah journey with the community.", label: "Community Umrah" },
  { value: "Family Umrah with spiritual focus.", label: "Family Umrah" },
  { value: "Group travel and accommodation support.", label: "Group travel" },
  { value: "Spiritual preparation and reflection.", label: "Spiritual focus" },
];

type FormState = {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
  prayerFacilityInfo: string;
  visibility: "network" | "invite-only";
  allowGuestRequest: boolean;
  allowBringGuest: boolean;
};

const TOTAL_STEPS = 4;

export function CreateUmrahWizard() {
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
    prayerFacilityInfo: "",
    visibility: "network",
    allowGuestRequest: false,
    allowBringGuest: false,
  });

  const update = (field: keyof FormState, value: string | boolean) => {
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
          type: "umrah",
          category: "religious",
          visibility: form.visibility,
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
    2: "Spiritual & practical",
    3: "Guests",
    4: "Review",
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
          onChange={(field, value) => update(field as keyof FormState, value)}
          errors={errors}
          showLocation={true}
          titleSuggestions={UMRAH_TITLE_SUGGESTIONS}
          locationOptions={UMRAH_LOCATION_OPTIONS}
        />
      )}

      {step === 2 && (
        <div className="elite-events space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
              Description
            </label>
            <DescriptionVibeChips
              value={form.description}
              onChange={(v) => update("description", v)}
              vibes={UMRAH_VIBES}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
              Prayer facility
            </label>
            <PrayerChips
              value={form.prayerFacilityInfo}
              onChange={(v) => update("prayerFacilityInfo", v)}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <GuestsBlock
          values={{
            visibility: form.visibility,
            allowGuestRequest: form.allowGuestRequest,
            allowBringGuest: form.allowBringGuest,
          }}
          onChange={(field, value) => update(field as keyof FormState, value)}
        />
      )}

      {step === 4 && (
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
          <p className="text-[var(--elite-text-secondary)]">
            Visibility: {form.visibility === "invite-only" ? "Invite only" : "Network"}
          </p>
        </div>
      )}
    </CreateStepLayout>
  );
}
