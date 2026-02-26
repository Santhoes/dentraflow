"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AppUser } from "@/lib/auth/app-auth";

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  plan: string;
  plan_expires_at: string | null;
  phone: string | null;
  working_hours: Record<string, { open: string; close: string }> | null;
  accepts_insurance: boolean;
  insurance_notes: string | null;
  website_domain: string | null;
  logo_url: string | null;
  widget_primary_color: string | null;
  widget_background_color: string | null;
  whatsapp_phone: string | null;
  default_appointment_charge: number | null;
  settings_completed_at: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  cancellation_policy_text: string | null;
  paypal_merchant_id: string | null;
  deposit_required: boolean;
  require_policy_agreement: boolean;
  deposit_rules_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface AppContextValue {
  user: AppUser | null;
  clinic: Clinic | null;
  loading: boolean;
  error: string | null;
  refetchClinic: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchClinic = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const data = (await res.json()) as { user: AppUser | null; clinic: Clinic | null };
    if (data.user) setUser(data.user);
    setClinic(data.clinic ?? null);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { user: AppUser | null; clinic: Clinic | null }) => {
        if (!data.user) {
          setUser(null);
          setClinic(null);
          return;
        }
        setUser(data.user);
        setClinic(data.clinic ?? null);
      })
      .catch(() => {
        setUser(null);
        setClinic(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        clinic,
        loading,
        error,
        refetchClinic,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
