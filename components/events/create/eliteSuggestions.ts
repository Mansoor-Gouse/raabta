/**
 * India-focused suggestions for Elite Event Creation Wizard.
 * Keyed by kind (from type picker); used for title and description suggestions.
 */

export type EliteKind =
  | "private-gathering"
  | "business-majlis"
  | "philanthropy"
  | "religious"
  | "family"
  | "trip-retreat"
  | "umrah-hajj";

export const ELITE_TITLE_SUGGESTIONS_BY_KIND: Record<EliteKind, string[]> = {
  "private-gathering": [
    "Private Dinner",
    "Intimate Gathering",
    "Exclusive Evening",
    "Members Soirée",
  ],
  "business-majlis": [
    "Private Business Majlis",
    "Muslim Founders Roundtable",
    "Real Estate Investment Circle",
    "Startup Investor Dinner",
    "Young Muslim Leaders Forum",
  ],
  philanthropy: [
    "Zakat Strategy Discussion",
    "Islamic Philanthropy Summit",
    "Community Impact Evening",
    "Charity Iftar",
  ],
  religious: [
    "Ramadan Iftar Gathering",
    "Islamic Scholarship Majlis",
    "Quran Reflection Majlis",
    "Hajj Preparation Gathering",
  ],
  family: [
    "Family Eid Dinner",
    "Family Day",
    "Eid Gathering",
    "Family Iftar",
  ],
  "trip-retreat": [
    "Curated Retreat",
    "Executive Wellness Retreat",
    "Private Getaway",
  ],
  "umrah-hajj": [
    "Private Umrah Delegation",
    "Hajj Group",
    "Umrah Journey",
  ],
};

export const ELITE_DESCRIPTION_SUGGESTIONS_BY_KIND: Record<EliteKind, string[]> = {
  "private-gathering": [
    "An intimate gathering for meaningful conversation and connection.",
  ],
  "business-majlis": [
    "A private gathering of entrepreneurs and investors to explore collaboration opportunities in emerging sectors.",
    "Strategic dialogue among Muslim business leaders on investment and growth.",
  ],
  philanthropy: [
    "A focused discussion on strategic giving and community impact.",
  ],
  religious: [
    "A spiritual gathering for reflection and fellowship.",
  ],
  family: [
    "A celebration with family and close friends.",
  ],
  "trip-retreat": [
    "A curated retreat for rest, reflection, and connection.",
  ],
  "umrah-hajj": [
    "A spiritual journey with the community.",
  ],
};

/** Map wizard kind to API type and category */
export function kindToTypeAndCategory(
  kind: string
): { type: "event" | "trip" | "retreat" | "umrah" | "hajj"; category?: string } {
  switch (kind) {
    case "business-majlis":
      return { type: "event", category: "business" };
    case "philanthropy":
      return { type: "event", category: "philanthropy" };
    case "religious":
      return { type: "event", category: "religious" };
    case "family":
      return { type: "event", category: "family" };
    case "trip-retreat":
      return { type: "trip", category: "luxury-trips" };
    case "umrah-hajj":
      return { type: "umrah", category: "religious" };
    case "private-gathering":
    default:
      return { type: "event" };
  }
}

export const ELITE_CATEGORIES = [
  { value: "business", label: "Business" },
  { value: "philanthropy", label: "Philanthropy" },
  { value: "religious", label: "Religious" },
  { value: "family", label: "Family" },
  { value: "education", label: "Education" },
  { value: "luxury-trips", label: "Curated Trips" },
] as const;

export const ELITE_CITIES = [
  "Hyderabad",
  "Mumbai",
  "Bangalore",
  "Dubai",
  "London",
  "Riyadh",
  "Jeddah",
  "Istanbul",
  "Delhi",
  "Chennai",
];

export const ELITE_VENUE_TYPES = [
  "Private Residence",
  "Hotel",
  "Restaurant",
  "Venue",
];
