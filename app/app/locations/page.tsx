"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  CalendarX2,
  Copy,
  Check,
  X,
} from "lucide-react";
import { hasPlanFeature, normalizePlan, getPlanLimit, formatPlanLimit } from "@/lib/plan-features";
import { COUNTRIES, TIMEZONES } from "@/lib/supabase/types";
import type { ClinicLocation, LocationFormState } from "./locations-types";
import { LocationsMainContent } from "./locations-content";

export type { ClinicLocation } from "./locations-types";

function formatAddress(loc: ClinicLocation): string {
  const parts = [
    loc.address_line1,
    loc.address_line2,
    [loc.city, loc.state].filter(Boolean).join(", "),
    loc.postal_code,
    loc.country,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No address";
}

function formatPrimaryAddress(clinic: { address_line1?: string | null; address_line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string; timezone?: string; phone?: string | null }): string {
  const parts = [
    clinic.address_line1,
    clinic.address_line2,
    [clinic.city, clinic.state].filter(Boolean).join(", "),
    clinic.postal_code,
    clinic.country,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : [clinic.country, clinic.timezone].filter(Boolean).join(" · ") || "—";
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

function getDefaultWorkingHours(): Record<string, { open: string; close: string } | null> {
  const h: Record<string, { open: string; close: string } | null> = {};
  DAYS.forEach((d) => {
    if (d === "sun") h[d] = null;
    else if (d === "sat") h[d] = { open: "09:00", close: "13:00" };
    else h[d] = { open: "09:00", close: "17:00" };
  });
  return h;
}

function workingHoursForPayload(wh: Record<string, { open: string; close: string } | null> | undefined): Record<string, { open: string; close: string }> | null {
  if (!wh) return null;
  const out: Record<string, { open: string; close: string }> = {};
  Object.entries(wh).forEach(([day, v]) => {
    if (v && v.open && v.close) out[day] = { open: v.open, close: v.close };
  });
  return Object.keys(out).length ? out : null;
}

export default function AppLocationsPage() {
  const { clinic, refetchClinic } = useApp();
  const [locations, setLocations] = useState<ClinicLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [locationFormError, setLocationFormError] = useState<string | null>(null);
  const [primaryEditOpen, setPrimaryEditOpen] = useState(false);
  const [primarySaving, setPrimarySaving] = useState(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedLocationLabel, setEmbedLocationLabel] = useState("");
  const [embedData, setEmbedData] = useState<{ embedUrl: string; iframeSnippet: string } | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedCopied, setEmbedCopied] = useState<"url" | "snippet" | null>(null);
  const [form, setForm] = useState<{
    name: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    timezone: string;
    phone: string;
    accepts_insurance: boolean;
    insurance_notes: string;
    working_hours: Record<string, { open: string; close: string } | null>;
  }>({
    name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    timezone: "",
    phone: "",
    accepts_insurance: true,
    insurance_notes: "",
    working_hours: getDefaultWorkingHours(),
  });
  const [primaryForm, setPrimaryForm] = useState<LocationFormState>({
    name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    timezone: "",
    phone: "",
    whatsapp_phone: "",
    accepts_insurance: true,
    insurance_notes: "",
    working_hours: getDefaultWorkingHours(),
    default_appointment_charge: "",
  });
  const [holidays, setHolidays] = useState<{ id: string; holiday_date: string; end_date: string | null; label: string | null }[]>([]);
  const [holidayForm, setHolidayForm] = useState({ date: "", end_date: "", label: "" });
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    if (!clinic?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("clinic_locations")
      .select("*")
      .eq("clinic_id", clinic.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!error) setLocations((data as ClinicLocation[]) || []);
    setLoading(false);
  }, [clinic?.id]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const fetchHolidays = useCallback(async () => {
    if (!clinic?.id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("clinic_holidays")
      .select("id, holiday_date, end_date, label")
      .eq("clinic_id", clinic.id)
      .is("location_id", null)
      .order("holiday_date", { ascending: true });
    setHolidays((data as { id: string; holiday_date: string; end_date: string | null; label: string | null }[]) || []);
  }, [clinic?.id]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const openEmbed = useCallback((locationId: string | null, label: string) => {
    setEmbedModalOpen(true);
    setEmbedLocationLabel(label);
    setEmbedData(null);
    setEmbedLoading(true);
    setEmbedCopied(null);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token;
      if (!token) {
        setEmbedLoading(false);
        return;
      }
      const url = locationId
        ? `/api/app/embed-url?location=${encodeURIComponent(locationId)}`
        : "/api/app/embed-url";
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          if (data.embedUrl && data.iframeSnippet) {
            setEmbedData({ embedUrl: data.embedUrl, iframeSnippet: data.iframeSnippet });
          }
        })
        .finally(() => setEmbedLoading(false));
    });
  }, []);

  const canAccess = clinic ? hasPlanFeature(clinic.plan, "multiLocation") : false;

  const addHoliday = async () => {
    if (!clinic?.id || !holidayForm.date.trim()) return;
    setAddingHoliday(true);
    const supabase = createClient();
    await supabase.from("clinic_holidays").insert({
      clinic_id: clinic.id,
      holiday_date: holidayForm.date.trim(),
      end_date: holidayForm.end_date.trim() || null,
      label: holidayForm.label.trim() || null,
    });
    setHolidayForm({ date: "", end_date: "", label: "" });
    await fetchHolidays();
    setAddingHoliday(false);
  };

  const deleteHoliday = async (id: string) => {
    if (!clinic?.id) return;
    setDeletingHolidayId(id);
    const supabase = createClient();
    await supabase.from("clinic_holidays").delete().eq("id", id).eq("clinic_id", clinic.id);
    await fetchHolidays();
    setDeletingHolidayId(null);
  };

  if (!clinic) return null;

  const plan = normalizePlan(clinic.plan);
  const limit = getPlanLimit(clinic.plan, "locations");
  const totalLocations = 1 + locations.length;
  const atLimit = limit !== null && totalLocations >= limit;
  const canAddMore = canAccess && !atLimit;

  const resetForm = () => {
    setForm({
      name: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      timezone: clinic.timezone || "",
      phone: (clinic as { whatsapp_phone?: string | null }).whatsapp_phone || "",
      accepts_insurance: true,
      insurance_notes: "",
      working_hours: getDefaultWorkingHours(),
    });
    setEditingId(null);
  };

  const openAdd = () => {
    setLocationFormError(null);
    resetForm();
    setForm((f) => ({ ...f, timezone: clinic.timezone || "", phone: (clinic as { whatsapp_phone?: string | null }).whatsapp_phone || "" }));
    setModalOpen("add");
  };

  const openEdit = (loc: ClinicLocation) => {
    setLocationFormError(null);
    const wh = (loc as { working_hours?: Record<string, { open: string; close: string } | null> | null }).working_hours;
    const merged: Record<string, { open: string; close: string } | null> = { ...getDefaultWorkingHours() };
    if (wh && typeof wh === "object") {
      DAYS.forEach((d) => {
        if (wh[d] && wh[d]!.open && wh[d]!.close) merged[d] = wh[d];
        else merged[d] = null;
      });
    }
    setForm({
      name: loc.name,
      address_line1: loc.address_line1 || "",
      address_line2: loc.address_line2 || "",
      city: loc.city || "",
      state: loc.state || "",
      postal_code: loc.postal_code || "",
      country: loc.country || "",
      timezone: loc.timezone || "",
      phone: loc.phone || "",
      accepts_insurance: (loc as { accepts_insurance?: boolean }).accepts_insurance !== false,
      insurance_notes: (loc as { insurance_notes?: string | null }).insurance_notes || "",
      working_hours: merged,
    });
    setEditingId(loc.id);
    setModalOpen("edit");
  };

  const saveLocation = async () => {
    if (!clinic?.id) return;
    if (!form.name.trim()) return;
    const whatsappTrim = form.phone.trim();
    if (!whatsappTrim) {
      setLocationFormError("WhatsApp number is required for this location.");
      return;
    }
    setLocationFormError(null);
    setSaving(true);
    const supabase = createClient();
    if (modalOpen === "add") {
      const { data, error } = await supabase
        .from("clinic_locations")
        .insert({
          clinic_id: clinic.id,
          name: form.name.trim(),
          address_line1: form.address_line1.trim() || null,
          address_line2: form.address_line2.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          postal_code: form.postal_code.trim() || null,
          country: form.country.trim() || null,
          timezone: form.timezone.trim() || null,
          phone: whatsappTrim,
          accepts_insurance: form.accepts_insurance,
          insurance_notes: form.insurance_notes.trim() || null,
          working_hours: workingHoursForPayload(form.working_hours),
          sort_order: locations.length,
        })
        .select("id")
        .single();
      if (!error) {
        await fetchLocations();
        setModalOpen(null);
        resetForm();
        setLocationFormError(null);
      }
    } else if (editingId) {
      const { error } = await supabase
        .from("clinic_locations")
        .update({
          name: form.name.trim(),
          address_line1: form.address_line1.trim() || null,
          address_line2: form.address_line2.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          postal_code: form.postal_code.trim() || null,
          country: form.country.trim() || null,
          timezone: form.timezone.trim() || null,
          phone: whatsappTrim,
          accepts_insurance: form.accepts_insurance,
          insurance_notes: form.insurance_notes.trim() || null,
          working_hours: workingHoursForPayload(form.working_hours),
        })
        .eq("id", editingId)
        .eq("clinic_id", clinic.id);
      if (!error) {
        await fetchLocations();
        setModalOpen(null);
        resetForm();
        setLocationFormError(null);
      }
    }
    setSaving(false);
  };

  const deleteLocation = async (id: string) => {
    if (!clinic?.id) return;
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("clinic_locations")
      .delete()
      .eq("id", id)
      .eq("clinic_id", clinic.id);
    if (!error) await fetchLocations();
    setDeletingId(null);
  };

  const openPrimaryEdit = () => {
    const wh = clinic.working_hours as Record<string, { open: string; close: string } | null> | null | undefined;
    const merged: Record<string, { open: string; close: string } | null> = { ...getDefaultWorkingHours() };
    if (wh && typeof wh === "object") {
      DAYS.forEach((d) => {
        if (wh[d] && wh[d]!.open && wh[d]!.close) merged[d] = wh[d];
        else merged[d] = null;
      });
    }
    const charge = (clinic as { default_appointment_charge?: number | null }).default_appointment_charge;
    setPrimaryForm({
      name: clinic.name,
      address_line1: (clinic as { address_line1?: string | null }).address_line1 ?? "",
      address_line2: (clinic as { address_line2?: string | null }).address_line2 ?? "",
      city: (clinic as { city?: string | null }).city ?? "",
      state: (clinic as { state?: string | null }).state ?? "",
      postal_code: (clinic as { postal_code?: string | null }).postal_code ?? "",
      country: clinic.country ?? "",
      timezone: clinic.timezone ?? TIMEZONES[0] ?? "",
      phone: (clinic as { phone?: string | null }).phone ?? "",
      whatsapp_phone: (clinic as { whatsapp_phone?: string | null }).whatsapp_phone ?? "",
      accepts_insurance: clinic.accepts_insurance !== false,
      insurance_notes: clinic.insurance_notes || "",
      working_hours: merged,
      default_appointment_charge: charge != null && charge > 0 ? String(charge) : "",
    });
    setPrimaryEditOpen(true);
  };

  const savePrimary = async () => {
    if (!primaryForm.whatsapp_phone?.trim()) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    setPrimarySaving(true);
    try {
      const res = await fetch("/api/app/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: primaryForm.name.trim(),
          country: primaryForm.country.trim() || undefined,
          timezone: primaryForm.timezone || undefined,
          whatsapp_phone: primaryForm.whatsapp_phone?.trim() || null,
          address_line1: primaryForm.address_line1.trim() || null,
          address_line2: primaryForm.address_line2.trim() || null,
          city: primaryForm.city.trim() || null,
          state: primaryForm.state.trim() || null,
          postal_code: primaryForm.postal_code.trim() || null,
          accepts_insurance: primaryForm.accepts_insurance,
          insurance_notes: primaryForm.insurance_notes.trim() || null,
          working_hours: workingHoursForPayload(primaryForm.working_hours),
          default_appointment_charge: (() => {
            const v = primaryForm.default_appointment_charge?.trim() ?? "";
            if (!v) return null;
            const n = parseFloat(v);
            return Number.isNaN(n) || n < 0 ? null : n;
          })(),
        }),
      });
      if (res.ok) {
        await refetchClinic();
        setPrimaryEditOpen(false);
      }
    } finally {
      setPrimarySaving(false);
    }
  };

  return (
    <>
    <LocationsMainContent
      clinic={clinic}
      locations={locations}
      loading={loading}
      totalLocations={totalLocations}
      limit={limit}
      formatPlanLimit={formatPlanLimit}
      formatPrimaryAddress={formatPrimaryAddress}
      formatAddress={formatAddress}
      openPrimaryEdit={openPrimaryEdit}
      openEdit={openEdit}
      deleteLocation={deleteLocation}
      deletingId={deletingId}
      openAdd={openAdd}
      canAddMore={canAddMore}
      canAccess={canAccess}
      atLimit={atLimit}
      holidays={holidays}
      holidayForm={holidayForm}
      setHolidayForm={setHolidayForm}
      addHoliday={addHoliday}
      addingHoliday={addingHoliday}
      deleteHoliday={deleteHoliday}
      deletingHolidayId={deletingHolidayId}
      modalOpen={modalOpen}
      form={form}
      setForm={setForm}
      setModalOpen={setModalOpen}
      setEditingId={setEditingId}
      editingId={editingId}
      saveLocation={saveLocation}
      saving={saving}
      resetForm={resetForm}
      locationFormError={locationFormError}
      clearLocationFormError={() => setLocationFormError(null)}
      primaryEditOpen={primaryEditOpen}
      primaryForm={primaryForm}
      setPrimaryForm={setPrimaryForm}
      savePrimary={savePrimary}
      setPrimaryEditOpen={setPrimaryEditOpen}
      primarySaving={primarySaving}
      COUNTRIES={COUNTRIES}
      TIMEZONES={TIMEZONES}
      DAYS={DAYS}
      DAY_LABELS={DAY_LABELS}
      onGetEmbed={canAccess ? openEmbed : undefined}
    />

    {embedModalOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-4"
        onClick={() => setEmbedModalOpen(false)}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="my-auto w-full max-w-lg shrink-0 rounded-xl border border-slate-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
            <h3 className="text-lg font-semibold text-slate-900">Chat widget embed — {embedLocationLabel}</h3>
            <button
              type="button"
              onClick={() => setEmbedModalOpen(false)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {embedLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : embedData ? (
              <>
                <p className="text-sm text-slate-600">
                  Use this URL on your website. It is specific to your clinic — only this link will load your chat widget.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Embed URL</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={embedData.embedUrl}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(embedData.embedUrl);
                        setEmbedCopied("url");
                        setTimeout(() => setEmbedCopied(null), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {embedCopied === "url" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      {embedCopied === "url" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Iframe code</label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(embedData.iframeSnippet);
                      setEmbedCopied("snippet");
                      setTimeout(() => setEmbedCopied(null), 2000);
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {embedCopied === "snippet" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {embedCopied === "snippet" ? "Copied" : "Copy iframe code"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Unable to load embed. Try again later.</p>
            )}
          </div>
        </div>
      </div>
    )}
  </>
  );
}
