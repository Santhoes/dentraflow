"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { EmbedChat } from "@/components/embed/EmbedChat";

function EmbedChatContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("clinic")?.trim() || null;
  const sig = searchParams.get("sig")?.trim() || null;
  const [clinic, setClinic] = useState<{
    name: string;
    location_name?: string | null;
    agent_name?: string | null;
    agent_id?: string | null;
    accepts_insurance: boolean;
    insurance_notes: string | null;
    logo_url: string | null;
    widget_primary_color: string | null;
    widget_background_color: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState<string | null>(null);

  const locationId = searchParams.get("location")?.trim() || null;
  const agentId = searchParams.get("agent")?.trim() || null;
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
          accepts_insurance: data.accepts_insurance !== false,
          insurance_notes: data.insurance_notes ?? null,
          logo_url: data.logo_url ?? null,
          widget_primary_color: data.widget_primary_color ?? null,
          widget_background_color: data.widget_background_color ?? null,
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
      <div className="flex min-h-[400px] items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || (slug && !clinic)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-white p-4">
        <p className="text-center text-sm text-slate-500">
          {error === "Chat unavailable" || error === "Invalid link"
            ? "Chat unavailable."
            : error || "Clinic not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full min-h-[50dvh] w-full max-w-full px-2 sm:max-w-md sm:min-h-[400px] sm:px-0">
      <EmbedChat
        clinicName={clinic!.name}
        locationName={clinic!.location_name ?? undefined}
        agentName={clinic!.agent_name ?? undefined}
        agentId={clinic!.agent_id ?? undefined}
        clinicSlug={slug!}
        locationId={searchParams.get("location")?.trim() || undefined}
        sig={sig!}
        logoUrl={clinic!.logo_url ?? undefined}
        primaryColor={clinic!.widget_primary_color ?? undefined}
        headerBackgroundColor={clinic!.widget_background_color ?? undefined}
      />
    </div>
  );
}

export default function EmbedChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <EmbedChatContent />
    </Suspense>
  );
}
