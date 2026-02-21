"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  created_at: string;
  updated_at: string;
}

interface AppContextValue {
  user: User | null;
  clinic: Clinic | null;
  loading: boolean;
  error: string | null;
  refetchClinic: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClinic = useCallback(async (userId: string, clearIfMissing = true) => {
    const supabase = createClient();
    const { data: member, error: memberErr } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (memberErr || !member?.clinic_id) {
      if (clearIfMissing) setClinic(null);
      return;
    }
    const { data: c, error: clinicErr } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", (member as { clinic_id: string }).clinic_id)
      .single();
    if (clinicErr) {
      if (clearIfMissing) setClinic(null);
      return;
    }
    setClinic(c as Clinic);
  }, []);

  const refetchClinic = useCallback(async () => {
    if (user?.id) await fetchClinic(user.id);
  }, [user?.id, fetchClinic]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setUser(null);
        setClinic(null);
        setLoading(false);
        return;
      }
      setUser(session.user);
      fetchClinic(session.user.id).finally(() => setLoading(false));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setClinic(null);
        return;
      }
      setUser(session.user);
      fetchClinic(session.user.id, false);
    });
    return () => subscription.unsubscribe();
  }, [fetchClinic]);

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
