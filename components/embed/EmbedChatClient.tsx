"use client";

import { useState, useEffect } from "react";
import { DentalChat } from "@/components/embed/DentalChat";

export interface EmbedChatClientProps {
  slug: string | null;
  sig: string | null;
  locationId: string | null;
  agentId: string | null;
}

export function EmbedChatClient({ slug, sig, locationId, agentId }: EmbedChatClientProps) {
  const [clinic, setClinic] = useState<{
    name: string;
    location_name?: string | null;
    agent_name?: string | null;
    agent_id?: string | null;
    plan?: string | null;
    accepts_insurance: boolean;
    insurance_notes: string | null;
    logo_url: string | null;
    widget_primary_color: string | null;
    widget_background_color: string | null;
    phone?: string | null;
    whatsapp_phone?: string | null;
    working_hours?: Record<string, { open: string; close: string }> | null;
    address?: string | null;
    timezone?: string;
  } | null>(null);
  const [loading, setLoading] = useState(!!(slug && sig));
  const [error, setError] = useState<string | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  useEffect(() => {
    if (!slug || !sig) {
      setLoading(false);
      if (slug && !sig) setError("Invalid link");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const base = typeof window !== "undefined" ? window.location.origin : "";
        let url = `${base}/api/public/clinic?slug=${encodeURIComponent(slug)}&sig=${encodeURIComponent(sig)}`;
        if (agentId) url += `&agent=${encodeURIComponent(agentId)}`;
        else if (locationId) url += `&location=${encodeURIComponent(locationId)}`;
        const res = await fetch(url);
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Clinic not found");
          setClinic(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setClinic({
          name: data.name || "Clinic",
          location_name: data.location_name ?? null,
          agent_name: data.agent_name ?? null,
          agent_id: data.agent_id ?? null,
          plan: data.plan ?? null,
          accepts_insurance: data.accepts_insurance !== false,
          insurance_notes: data.insurance_notes ?? null,
          logo_url: data.logo_url ?? null,
          widget_primary_color: data.widget_primary_color ?? null,
          widget_background_color: data.widget_background_color ?? null,
          phone: data.phone ?? null,
          whatsapp_phone: data.whatsapp_phone ?? null,
          working_hours: data.working_hours ?? null,
          address: data.address ?? null,
          timezone: data.timezone ?? "America/New_York",
        });
      } catch {
        if (!cancelled) {
          setError("Something went wrong");
          setClinic(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, sig, locationId, agentId]);

  if (loading) {
    return (
      <div
        className="flex min-h-[100dvh] w-full items-center justify-center bg-slate-50 dark:bg-slate-900 sm:min-h-[400px]"
        style={{ minHeight: "320px" }}
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
      </div>
    );
  }

  if (error || (slug && !clinic)) {
    return (
      <div
        className="flex min-h-[100dvh] w-full items-center justify-center bg-slate-50 p-4 dark:bg-slate-900 sm:min-h-[400px]"
        style={{ minHeight: "320px" }}
      >
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          {error === "Chat unavailable" || error === "Invalid link"
            ? "Chat unavailable."
            : error || "Clinic not found."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        isWidgetOpen
          ? "min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 sm:min-h-[400px]"
          : "min-h-0 w-full bg-transparent"
      }
      style={isWidgetOpen ? { minHeight: "320px" } : undefined}
    >
      <DentalChat
        clinicName={clinic!.name}
        locationName={clinic!.location_name ?? undefined}
        agentName={clinic!.agent_name ?? undefined}
        agentId={clinic!.agent_id ?? undefined}
        clinicSlug={slug!}
        locationId={locationId ?? undefined}
        sig={sig!}
        logoUrl={clinic!.logo_url ?? undefined}
        primaryColor={clinic!.widget_primary_color ?? undefined}
        isElitePlan={clinic!.plan === "elite"}
        plan={clinic!.plan ?? null}
        onOpenChange={setIsWidgetOpen}
        clinicInfo={{
          name: clinic!.name,
          phone: clinic!.phone ?? undefined,
          whatsapp_phone: clinic!.whatsapp_phone ?? undefined,
          working_hours: clinic!.working_hours ?? undefined,
          address: clinic!.address ?? undefined,
          timezone: clinic!.timezone ?? "America/New_York",
        }}
      />
    </div>
  );
}
