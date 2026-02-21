"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Zap, Crown, Lock } from "lucide-react";
import { hasPlanFeature, normalizePlan } from "@/lib/plan-features";
import { PLANS } from "@/lib/supabase/types";

const DEMO_PRESETS = [
  { primary: "#0d9488", headerBg: "#f8fafc" },
  { primary: "#2563eb", headerBg: "#eff6ff" },
  { primary: "#7c3aed", headerBg: "#f5f3ff" },
  { primary: "#dc2626", headerBg: "#fef2f2" },
];

const DEMO_INTERVAL_MS = 2800;

export default function AppSettingsPage() {
  const { clinic, refetchClinic } = useApp();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [widgetPrimaryColor, setWidgetPrimaryColor] = useState("#0d9488");
  const [widgetBackgroundColor, setWidgetBackgroundColor] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const initializedForClinicId = useRef<string | null>(null);

  useEffect(() => {
    if (!hasPlanFeature(clinic?.plan ?? null, "customBranding")) {
      const t = setInterval(() => {
        setDemoIndex((i) => (i + 1) % DEMO_PRESETS.length);
      }, DEMO_INTERVAL_MS);
      return () => clearInterval(t);
    }
  }, [clinic?.plan]);

  useEffect(() => {
    if (!clinic?.id) return;
    if (initializedForClinicId.current === clinic.id) return;
    initializedForClinicId.current = clinic.id;
    setLogoUrl((clinic as { logo_url?: string | null }).logo_url ?? "");
    setWidgetPrimaryColor((clinic as { widget_primary_color?: string | null }).widget_primary_color ?? "#0d9488");
    setWidgetBackgroundColor((clinic as { widget_background_color?: string | null }).widget_background_color ?? "");
  }, [clinic?.id, (clinic as { logo_url?: string | null })?.logo_url, (clinic as { widget_primary_color?: string | null })?.widget_primary_color, (clinic as { widget_background_color?: string | null })?.widget_background_color]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    setSavingBranding(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setMessage({ type: "err", text: "Please sign in again." });
        setSavingBranding(false);
        return;
      }
      const res = await fetch("/api/app/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          logo_url: logoUrl.trim() || null,
          widget_primary_color: widgetPrimaryColor.trim() || null,
          widget_background_color: widgetBackgroundColor.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: (data.error as string) || "Failed to save." });
        setSavingBranding(false);
        return;
      }
      setMessage({ type: "ok", text: "Branding saved. Changes will appear in the chat widget." });
      refetchClinic();
    } catch {
      setMessage({ type: "err", text: "Failed to save." });
    }
    setSavingBranding(false);
  };

  if (!clinic) return null;

  const plan = normalizePlan(clinic.plan);
  const planInfo = PLANS.find((p) => p.id === plan);
  const hasCustomBranding = hasPlanFeature(clinic.plan, "customBranding");

  const primaryHex = /^#[0-9A-Fa-f]{6}$/.test(widgetPrimaryColor.trim()) ? widgetPrimaryColor.trim() : "#0d9488";
  const headerBgHex = widgetBackgroundColor.trim() && /^#[0-9A-Fa-f]{6}$/.test(widgetBackgroundColor.trim())
    ? widgetBackgroundColor.trim()
    : "#f8fafc";

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Settings</h1>
          <p className="mt-1 text-slate-600">
            {hasCustomBranding
              ? "Manage chat widget branding and plan. Your plan: " + (planInfo?.name ?? plan) + "."
              : "Your plan: " + (planInfo?.name ?? plan) + ". Upgrade to Elite to customize the chat widget on your site."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            <Link href="/app/settings/details" className="font-medium text-primary hover:underline">Clinic details</Link>
            {" "}(name, phone, WhatsApp) — use a number with WhatsApp for better patient contact.
          </p>
        </div>
        <span
          className={
            plan === "elite"
              ? "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800"
              : plan === "pro"
                ? "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
          }
        >
          {plan === "elite" ? <Crown className="h-4 w-4" /> : plan === "pro" ? <Zap className="h-4 w-4" /> : null}
          {planInfo?.name ?? plan} plan
        </span>
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

      {/* Chat widget: Elite only; other plans see upgrade CTA */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Chat widget</h2>
        <div className="space-y-6">
          <div
            className={
              hasCustomBranding
                ? "rounded-xl border border-amber-200 bg-amber-50/30 p-6 shadow-sm"
                : "rounded-xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm"
            }
          >
            <p className="text-sm font-medium text-slate-900">Chat widget branding</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {hasCustomBranding
                ? "Configure your logo and chat widget colors. These appear in the embed chat on your website."
                : "Logo and widget colors are available on Elite. Upgrade to customize the chat widget on your site."}
            </p>
            {!hasCustomBranding && (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo — upgrade to Elite to customize</p>
                </div>
                <div className="relative mt-2">
                  <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-slate-200/50 transition-all duration-300">
                    <div
                      className="flex items-center gap-2 border-b border-slate-200 px-2 py-2 transition-[background-color] duration-500 ease-out"
                      style={{ backgroundColor: DEMO_PRESETS[demoIndex].headerBg }}
                    >
                      <span className="relative inline-flex shrink-0">
                        <img src="/logo.png" alt="" className="h-6 w-6 rounded object-contain" />
                        <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
                      </span>
                      <span className="truncate text-xs font-medium text-slate-700">
                        {clinic?.name ?? "Your clinic"} — Chat
                      </span>
                    </div>
                    <div className="space-y-1.5 bg-slate-50/50 p-2">
                      <div className="flex justify-start">
                        <div
                          className="max-w-[85%] rounded-xl rounded-bl px-2 py-1.5 text-xs text-slate-700 transition-[background-color] duration-500"
                          style={{ backgroundColor: `${DEMO_PRESETS[demoIndex].primary}20` }}
                        >
                          Hi! I&apos;m the AI receptionist…
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div
                          className="max-w-[85%] rounded-xl rounded-br px-2 py-1.5 text-xs text-white transition-[background-color] duration-500"
                          style={{ backgroundColor: DEMO_PRESETS[demoIndex].primary }}
                        >
                          Book appointment
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 border-t border-slate-100 p-1.5">
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-400">
                        Type here…
                      </div>
                      <div
                        className="h-7 w-7 shrink-0 rounded-lg transition-[background-color] duration-500"
                        style={{ backgroundColor: DEMO_PRESETS[demoIndex].primary }}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Colors and header change automatically in the demo. Upgrade to set your own logo and colors.
                  </p>
                </div>
                <Link
                  href="/app/plan"
                  className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Upgrade to Elite
                </Link>
              </>
            )}
            {hasCustomBranding && (
              <form onSubmit={handleSaveBranding} className="mt-4 max-w-lg space-y-4">
                <div>
                  <label htmlFor="branding-logo" className="block text-sm font-medium text-slate-700">Logo URL</label>
                  <p className="mt-0.5 text-xs text-slate-500">Full URL to your logo image (e.g. https://yoursite.com/logo.png). Shown in the widget header.</p>
                  <input
                    id="branding-logo"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label htmlFor="branding-primary" className="block text-sm font-medium text-slate-700">Widget primary color</label>
                  <p className="mt-0.5 text-xs text-slate-500">Used for send button and patient message bubbles (hex, e.g. #0d9488).</p>
                  <div className="mt-1 flex gap-2">
                    <input
                      id="branding-primary"
                      type="color"
                      value={widgetPrimaryColor}
                      onChange={(e) => setWidgetPrimaryColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border border-slate-200"
                    />
                    <input
                      type="text"
                      value={widgetPrimaryColor}
                      onChange={(e) => setWidgetPrimaryColor(e.target.value)}
                      placeholder="#0d9488"
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="branding-bg" className="block text-sm font-medium text-slate-700">Widget header background (optional)</label>
                  <p className="mt-0.5 text-xs text-slate-500">Hex color for the chat header bar. Leave empty for default.</p>
                  <div className="mt-1 flex gap-2">
                    <input
                      id="branding-bg"
                      type="color"
                      value={widgetBackgroundColor || "#f8fafc"}
                      onChange={(e) => setWidgetBackgroundColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border border-slate-200"
                    />
                    <input
                      type="text"
                      value={widgetBackgroundColor}
                      onChange={(e) => setWidgetBackgroundColor(e.target.value)}
                      placeholder="#f8fafc or leave empty"
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</p>
                  <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-slate-200/50">
                    <div
                      className="flex items-center gap-2 border-b border-slate-200 px-2 py-2 transition-[background-color] duration-300 ease-out"
                      style={{ backgroundColor: headerBgHex }}
                    >
                      <span className="relative inline-flex shrink-0">
                        <img
                          src={logoUrl.trim() || "/logo.png"}
                          alt=""
                          className="h-6 w-6 rounded object-contain transition-opacity duration-300"
                          onError={(e) => {
                            if (e.currentTarget.src !== "/logo.png") {
                              e.currentTarget.src = "/logo.png";
                            }
                          }}
                        />
                        <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
                      </span>
                      <span className="truncate text-xs font-medium text-slate-700">
                        {clinic?.name ?? "Your clinic"} — Chat
                      </span>
                    </div>
                    <div className="space-y-1.5 bg-slate-50/50 p-2">
                      <div className="flex justify-start">
                        <div
                          className="max-w-[85%] rounded-xl rounded-bl px-2 py-1.5 text-xs text-slate-700 transition-[background-color] duration-300"
                          style={{ backgroundColor: `${primaryHex}20` }}
                        >
                          Hi! I&apos;m the AI receptionist…
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div
                          className="max-w-[85%] rounded-xl rounded-br px-2 py-1.5 text-xs text-white transition-[background-color] duration-300"
                          style={{ backgroundColor: primaryHex }}
                        >
                          Book appointment
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 border-t border-slate-100 p-1.5">
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-400">
                        Type here…
                      </div>
                      <div
                        className="h-7 w-7 shrink-0 rounded-lg transition-[background-color] duration-300"
                        style={{ backgroundColor: primaryHex }}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Changes above update the preview with smooth transitions.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={savingBranding}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingBranding ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null} Save branding
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
