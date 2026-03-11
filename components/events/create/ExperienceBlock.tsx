"use client";

import { DressCodeChips } from "./DressCodeChips";
import { EtiquetteChips } from "./EtiquetteChips";
import { PrayerChips } from "./PrayerChips";

export type ExperienceValues = {
  dressCode: string;
  etiquette: string;
  halalMenuDetails?: string;
  prayerFacilityInfo: string;
};

type ExperienceBlockProps = {
  values: ExperienceValues;
  onChange: (field: keyof ExperienceValues, value: string) => void;
  errors?: Partial<Record<keyof ExperienceValues, string>>;
  showDressCode?: boolean;
};

export function ExperienceBlock({
  values,
  onChange,
  showDressCode = true,
}: ExperienceBlockProps) {
  return (
    <div className="elite-events space-y-5">
      {showDressCode && (
        <div>
          <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
            Dress code
          </label>
          <DressCodeChips
            value={values.dressCode}
            onChange={(v) => onChange("dressCode", v)}
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
          Etiquette & guidelines
        </label>
        <EtiquetteChips
          value={values.etiquette}
          onChange={(v) => onChange("etiquette", v)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--elite-text-secondary)] mb-2">
          Prayer facility
        </label>
        <PrayerChips
          value={values.prayerFacilityInfo}
          onChange={(v) => onChange("prayerFacilityInfo", v)}
        />
      </div>
    </div>
  );
}
