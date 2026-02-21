"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/supabase/types";
import { Loader2, ArrowLeft } from "lucide-react";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Asia/Kolkata", "Asia/Dubai", "Australia/Sydney",
];

export default function AppSettingsDetailsPage() {
  const { clinic, refetchClinic } = useApp();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    country: "",
    timezone: "America/New_York",
    whatsapp_phone: "",
    accepts_insurance: true,
    insurance_notes: "",
  });
  const initializedForClinicId = useRef<string | null>(null);

  useEffect(() => {
    if (!clinic?.id) return;
    if (initializedForClinicId.current === clinic.id) return;
    initializedForClinicId.current = clinic.id;
    setForm({
      name: clinic.name,
      country: clinic.country,
      timezone: clinic.timezone || "America/New_York",
      whatsapp_phone: (clinic as { whatsapp_phone?: string | null }).whatsapp_phone || "",
      accepts_insurance: clinic.accepts_insurance !== false,
      insurance_notes: clinic.insurance_notes || "",
    });
  }, [clinic?.id, clinic?.name, clinic?.country, clinic?.timezone, (clinic as { whatsapp_phone?: string | null })?.whatsapp_phone, clinic?.accepts_insurance, clinic?.insurance_notes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    if (!form.whatsapp_phone.trim()) {
      setMessage({ type: "err", text: "WhatsApp number is required." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setMessage({ type: "err", text: "Please sign in again." });
        setSaving(false);
        return;
      }
      const res = await fetch("/api/app/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          country: form.country.trim(),
          timezone: form.timezone,
          whatsapp_phone: form.whatsapp_phone.trim() || null,
          accepts_insurance: form.accepts_insurance,
          insurance_notes: form.insurance_notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Failed to save." });
        setSaving(false);
        return;
      }
      setMessage({ type: "ok", text: "Settings saved." });
      refetchClinic();
    } catch {
      setMessage({ type: "err", text: "Failed to save." });
    }
    setSaving(false);
  };

  if (!clinic) return null;

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div>
        <Link
          href="/app/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" /> Back to Settings
        </Link>
        <h1 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">Clinic details</h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">Practice name, country, timezone, WhatsApp number, and insurance. Used by your AI receptionist.</p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-700">Practice name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Country</label>
          <select
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Timezone</label>
          <select
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">WhatsApp number *</label>
          <p className="mt-0.5 text-xs text-slate-500">
            Required for reminders and patient contact. Include country code (e.g. +1 555 123 4567).
          </p>
          <input
            type="tel"
            value={form.whatsapp_phone}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp_phone: e.target.value }))}
            placeholder="e.g. +1 555 123 4567"
            required
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="accepts_insurance"
            checked={form.accepts_insurance}
            onChange={(e) => setForm((f) => ({ ...f, accepts_insurance: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <label htmlFor="accepts_insurance" className="text-sm font-medium text-slate-700">
            We accept insurance (patients will see this in the AI chat)
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Insurance notes (optional)</label>
          <textarea
            value={form.insurance_notes}
            onChange={(e) => setForm((f) => ({ ...f, insurance_notes: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            rows={2}
            placeholder="e.g. We accept most major plans. Out-of-network welcome."
          />
        </div>
        <button
          type="submit"
          disabled={saving || !form.whatsapp_phone.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </button>
      </form>
    </div>
  );
}
