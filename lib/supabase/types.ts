export type PlanId = "starter" | "pro" | "elite";

/** Plan limits: null = unlimited */
export interface PlanLimits {
  /** Max clinic locations/branches */
  locations: number | null;
  /** Max AI receptionist agents */
  aiAgents: number | null;
  /** Max chat widgets (e.g. per website/domain) */
  chatWidgets: number | null;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: { locations: 1, aiAgents: 1, chatWidgets: 1 },
  pro: { locations: 3, aiAgents: 2, chatWidgets: 3 },
  elite: { locations: null, aiAgents: 5, chatWidgets: null },
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
  { id: "starter", name: "Starter", priceCents: 2900, description: "Best for small clinic with 1 location." },
  { id: "pro", name: "Pro", priceCents: 7900, description: "Best for growing clinics or 2–3 branches." },
  { id: "elite", name: "Elite", priceCents: 14900, description: "Best for big clinics or dental chains." },
];

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  starter: [
    "1 location (single clinic)",
    "1 AI receptionist agent",
    "1 chat widget",
    "40 messages/session, 300/day chat",
    "Email reminders",
    "Change & cancel via chat",
    "Basic chat analytics",
  ],
  pro: [
    "Everything in Starter",
    "Up to 3 locations / branches",
    "Up to 2 AI agents",
    "Up to 3 chat widgets",
    "120 messages/session, 1,500/day chat",
    "Multi-location dashboard",
    "Advanced booking analytics",
    "Priority support",
  ],
  elite: [
    "Everything in Pro",
    "Unlimited locations / branches",
    "Up to 5 AI agents",
    "Unlimited chat widgets",
    "300 messages/session, 5,000/day chat",
    "WhatsApp integration",
    "Advanced AI insights & revenue reports",
    "Automated no-show recovery",
    "Custom branding (logo & colors in widget)",
  ],
};

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "clinic";
}
