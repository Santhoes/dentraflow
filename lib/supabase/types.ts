export type PlanId = "starter" | "pro" | "elite" | "smart_booking";

/** Plan limits: null = unlimited */
export interface PlanLimits {
  /** Max clinic locations/branches */
  locations: number | null;
  /** Max staff accounts / clinic members */
  staffAssistants: number | null;
  /** Max chat widgets (e.g. per website/domain) */
  chatWidgets: number | null;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: { locations: 1, staffAssistants: 1, chatWidgets: 1 },
  pro: { locations: 3, staffAssistants: 2, chatWidgets: 3 },
  elite: { locations: 10, staffAssistants: 5, chatWidgets: 10 },
  smart_booking: { locations: 10, staffAssistants: 5, chatWidgets: 10 },
};

export interface SignupTempData {
  email: string;
  password?: string;
  clinicName: string;
  country: string;
  timezone: string;
  whatsapp_phone: string;
  workingHours: Record<string, { open: string; close: string }> | null;
  plan: PlanId;
}

export const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "India", "Germany", "France", "Spain",
  "Italy", "Netherlands", "Ireland", "New Zealand", "Singapore", "United Arab Emirates", "South Africa",
  "Brazil", "Mexico", "Japan", "South Korea", "Other",
];

/** Common IANA timezones for dropdowns */
export const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
];

export const SIGNUP_STORAGE_KEY = "dentraflow_signup_temp";

export const PLANS: { id: PlanId; name: string; priceCents: number; description: string }[] = [
  { id: "starter", name: "Starter", priceCents: 2900, description: "Best for single-location clinics" },
  { id: "pro", name: "Pro", priceCents: 7900, description: "Best for growing clinics" },
  { id: "elite", name: "Elite", priceCents: 14900, description: "Best for large clinics & small chains" },
  {
    id: "smart_booking",
    name: "Smart Booking Site",
    priceCents: 19900,
    description: "Best for clinics that want a complete AI-powered booking website",
  },
];

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  starter: [
    "1 location",
    "1 booking assistant",
    "1 chat widget",
    "Up to 300 booking interactions/day",
    "Email confirmations & reminders",
    "Change & cancel via chat",
    "Basic booking analytics",
  ],
  pro: [
    "Everything in Starter",
    "Up to 3 locations",
    "Up to 3 chat widgets",
    "Multi-provider scheduling",
    "Up to 1,500 booking interactions/day",
    "Advanced booking analytics",
    "Priority support",
    "Add to Google Calendar (after booking)",
  ],
  elite: [
    "Everything in Pro",
    "Up to 10 locations",
    "Up to 5 assistants",
    "Up to 10 chat widgets",
    "Up to 5,000 booking interactions/day",
    "Email confirmations & reminders",
    "Automated no-show recovery",
    "Revenue, performance, and paid booking (deposit) reports",
    "Custom branding (logo & widget colors)",
    "Add to Google Calendar (after booking)",
  ],
  smart_booking: [
    "Everything in Elite",
    "Dedicated Smart Booking Page (dentraflow.com/clinic-name)",
    "Fully branded booking experience",
    "Mobile-optimized standalone site",
    "Conversion-optimized layout",
    "Shareable booking link & QR code",
    "Premium hosting & performance",
    "Priority onboarding assistance",
  ],
};

export function slugFromName(name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    || "clinic";
  // "demo" is reserved (public clinic API rejects it for embed). Use a safe alternative.
  return slug === "demo" ? "demo-clinic" : slug;
}
