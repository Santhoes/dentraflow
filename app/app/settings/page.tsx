"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useApp } from "@/lib/app-context";
import { Loader2, Zap, Crown, Lock, Plus, Trash2, CreditCard, FileText } from "lucide-react";
import { hasPlanFeature, normalizePlan, planAtLeast } from "@/lib/plan-features";
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

  const [services, setServices] = useState<{ id: string; name: string; duration_minutes: number; enabled: boolean }[]>([]);
  const [lastSavedServices, setLastSavedServices] = useState<{ id: string; name: string; duration_minutes: number; enabled: boolean }[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [paypalMerchantId, setPaypalMerchantId] = useState("");
  const [depositRequired, setDepositRequired] = useState(false);
  const [requirePolicyAgreement, setRequirePolicyAgreement] = useState(true);
  const [defaultDepositAmount, setDefaultDepositAmount] = useState("");
  const [depositCurrency, setDepositCurrency] = useState("USD");
  const [savingPayments, setSavingPayments] = useState(false);

  const servicesUnchanged =
    services.length === lastSavedServices.length &&
    services.every(
      (s, i) =>
        lastSavedServices[i] &&
        lastSavedServices[i].id === s.id &&
        lastSavedServices[i].name === s.name &&
        lastSavedServices[i].duration_minutes === s.duration_minutes &&
        lastSavedServices[i].enabled === s.enabled
    );

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

  useEffect(() => {
    if (!clinic?.id) return;
    setCancellationPolicy((clinic as { cancellation_policy_text?: string | null }).cancellation_policy_text ?? "");
    setPaypalMerchantId((clinic as { paypal_merchant_id?: string | null }).paypal_merchant_id ?? "");
    setDepositRequired((clinic as { deposit_required?: boolean }).deposit_required === true);
    setRequirePolicyAgreement((clinic as { require_policy_agreement?: boolean }).require_policy_agreement !== false);
    const rules = (clinic as { deposit_rules_json?: { default_amount?: number; currency?: string } | null }).deposit_rules_json;
    if (rules?.default_amount != null) setDefaultDepositAmount(String(rules.default_amount));
    else setDefaultDepositAmount("");
    if (rules?.currency) setDepositCurrency(rules.currency);
    else setDepositCurrency("USD");
  }, [clinic?.id, (clinic as { cancellation_policy_text?: string | null })?.cancellation_policy_text, (clinic as { paypal_merchant_id?: string | null })?.paypal_merchant_id, (clinic as { deposit_required?: boolean })?.deposit_required, (clinic as { require_policy_agreement?: boolean })?.require_policy_agreement, (clinic as { deposit_rules_json?: unknown })?.deposit_rules_json]);

  useEffect(() => {
    if (!clinic?.id) return;
    let cancelled = false;
    setLoadingServices(true);
    (async () => {
      try {
        const res = await fetch("/api/app/clinic/services", { credentials: "include" });
        if (cancelled || !res.ok) return;
        const data = await res.json().catch(() => ({}));
        const raw = (data as { services?: { id: string; name: string; duration_minutes: number; enabled?: boolean }[] }).services;
        const list = Array.isArray(raw)
          ? raw.map((s) => ({ ...s, enabled: s.enabled !== false }))
          : [];
        setServices(list);
        setLastSavedServices(list);
      } finally {
        if (!cancelled) setLoadingServices(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clinic?.id]);

  const handleSaveServices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingServices(true);
    setMessage(null);
    try {
      const payload = services.filter((s) => s.name.trim().length > 0 && s.duration_minutes >= 15 && s.duration_minutes <= 480);
      const res = await fetch("/api/app/clinic/services", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: payload.map((s) => ({
            id: s.id || undefined,
            name: s.name.trim(),
            duration_minutes: s.duration_minutes,
            enabled: s.enabled !== false,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: (data.error as string) || "Failed to save." });
        setSavingServices(false);
        return;
      }
      const raw = (data as { services?: { id: string; name: string; duration_minutes: number; enabled?: boolean }[] }).services;
      const list = Array.isArray(raw) ? raw.map((s) => ({ ...s, enabled: s.enabled !== false })) : [];
      setServices(list);
      setLastSavedServices(list);
      setMessage({ type: "ok", text: "Appointment types saved. They appear as suggestions in the chat and set slot length." });
    } catch {
      setMessage({ type: "err", text: "Failed to save." });
    }
    setSavingServices(false);
  };

  const handleSavePaymentsAndPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    setSavingPayments(true);
    setMessage(null);
    try {
      const policy = cancellationPolicy.trim().slice(0, 15000);
      const body: Record<string, unknown> = {
        cancellation_policy_text: policy || null,
      };
      if (planAtLeast(plan, "elite")) {
        body.paypal_merchant_id = paypalMerchantId.trim() || null;
        body.deposit_required = depositRequired;
        body.require_policy_agreement = requirePolicyAgreement;
        if (!depositRequired) {
          body.deposit_rules_json = null;
        } else {
          const amount = defaultDepositAmount.trim() ? parseFloat(defaultDepositAmount) : null;
          if (amount != null && !Number.isNaN(amount) && amount >= 0) {
            body.deposit_rules_json = {
              default_amount: Math.round(amount * 100) / 100,
              currency: depositCurrency,
            };
          } else {
            body.deposit_rules_json = null;
          }
        }
      }
      const res = await fetch("/api/app/clinic", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: (data.error as string) || "Failed to save." });
        setSavingPayments(false);
        return;
      }
      setMessage({ type: "ok", text: "Payments and policy saved." });
      refetchClinic();
    } catch {
      setMessage({ type: "err", text: "Failed to save." });
    }
    setSavingPayments(false);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    setSavingBranding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/app/clinic", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
              : "Your plan: " + (planInfo?.name ?? plan) + ". Upgrade to Elite or Smart Booking Site to customize the chat widget on your site."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            <Link href="/app/settings/details" className="font-medium text-primary hover:underline">Clinic details</Link>
            {" "}(name, phone) for patient contact. Payments & policy (cancellation, PayPal, deposit) below.
          </p>
        </div>
        <span
          className={
            planAtLeast(plan, "elite")
              ? "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800"
              : plan === "pro"
                ? "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
          }
        >
          {planAtLeast(plan, "elite") ? <Crown className="h-4 w-4" /> : plan === "pro" ? <Zap className="h-4 w-4" /> : null}
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

      {/* Payments & policies: cancellation policy for all; PayPal + deposit for Elite only */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Payments & policies</h2>
        <div className={`rounded-xl border p-6 shadow-sm ${planAtLeast(plan, "elite") ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-slate-50/30"}`}>
          <p className="text-sm font-medium text-slate-900">Cancellation policy and deposit (Elite / Smart Booking Site)</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Set the cancellation and refund policy text that patients see before paying a deposit. Elite and Smart Booking Site plans can link a PayPal Business account and require a deposit to confirm bookings.
          </p>
          <form onSubmit={handleSavePaymentsAndPolicy} className="mt-4 space-y-4">
            <div>
              <label htmlFor="cancellation-policy" className="block text-sm font-medium text-slate-700">
                <FileText className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                Cancellation & refund policy
              </label>
              <p className="mt-0.5 text-xs text-slate-500">Shown to patients before they pay a deposit. Include your cancellation and refund rules.</p>
              <textarea
                id="cancellation-policy"
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                rows={4}
                placeholder="e.g. Cancellations with more than 24 hours notice receive a full refund. No-shows forfeit the deposit."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                maxLength={15001}
              />
              <p className="mt-0.5 text-xs text-slate-500">{cancellationPolicy.length} / 15000 characters</p>
            </div>

            {planAtLeast(plan, "elite") ? (
              <>
                <div>
                  <label htmlFor="paypal-merchant-id" className="block text-sm font-medium text-slate-700">
                    <CreditCard className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                    PayPal Business Merchant ID
                  </label>
                  <p className="mt-0.5 text-xs text-slate-500">Your PayPal Business account merchant ID. Deposit payments go directly to this account. Find it in your PayPal Business profile or developer dashboard.</p>
                  <input
                    id="paypal-merchant-id"
                    type="text"
                    value={paypalMerchantId}
                    onChange={(e) => setPaypalMerchantId(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))}
                    placeholder="e.g. ABC123XYZ"
                    maxLength={64}
                    className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-mono"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="deposit-required"
                    checked={depositRequired}
                    onChange={(e) => setDepositRequired(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="deposit-required" className="text-sm font-medium text-slate-700">
                    Require deposit to confirm booking
                  </label>
                </div>
                {depositRequired && (
                  <>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="require-policy-agreement"
                        checked={requirePolicyAgreement}
                        onChange={(e) => setRequirePolicyAgreement(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="require-policy-agreement" className="text-sm font-medium text-slate-700">
                        Require patients to agree to cancellation policy before confirming
                      </label>
                    </div>
                    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
                    <div>
                      <label htmlFor="default-deposit-amount" className="block text-sm font-medium text-slate-700">Default deposit amount</label>
                      <input
                        id="default-deposit-amount"
                        type="number"
                        min={0}
                        max={100000}
                        step={0.01}
                        value={defaultDepositAmount}
                        onChange={(e) => setDefaultDepositAmount(e.target.value)}
                        placeholder="25"
                        className="mt-1 w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="deposit-currency" className="block text-sm font-medium text-slate-700">Currency</label>
                      <select
                        id="deposit-currency"
                        value={depositCurrency}
                        onChange={(e) => setDepositCurrency(e.target.value)}
                        className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-600">
                  PayPal linking and deposit requirements are available on the Elite or Smart Booking Site plan. Upgrade to accept deposits and receive payments directly to your PayPal Business account.
                </p>
                <Link href="/app/plan" className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90">Upgrade to Elite or Smart Booking Site</Link>
              </div>
            )}

            <button
              type="submit"
              disabled={savingPayments}
              className="min-h-[44px] rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 touch-manipulation sm:py-2"
            >
              {savingPayments ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null} Save payments & policy
            </button>
          </form>
        </div>
      </section>

      {/* Appointment types first: enable/disable or edit; no list until clinic adds or migration seeds */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Appointment types</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-900">Service names and durations</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Add or edit appointment types. These appear as suggestion chips when patients book (e.g. Preventive, Restorative). Duration sets the length of each time slot. Enable or disable services your clinic offers.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Time slots in the chat use your clinic&apos;s working hours. Set them in <Link href="/app/locations" className="font-medium text-primary hover:underline">App → Locations</Link> (per location).
          </p>
          {loadingServices ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <form onSubmit={handleSaveServices} className="mt-4">
              <div className="space-y-3">
                {services.map((s, i) => (
                  <div
                    key={s.id || `new-${i}`}
                    className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
                      s.enabled ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100"
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={(e) =>
                          setServices((prev) => {
                            const next = [...prev];
                            next[i] = { ...next[i], enabled: e.target.checked };
                            return next;
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-slate-700">Show in chat</span>
                    </label>
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) =>
                        setServices((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], name: e.target.value };
                          return next;
                        })
                      }
                      placeholder="e.g. Preventive"
                      className="min-h-[44px] w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 touch-manipulation sm:w-48"
                    />
                    <input
                      type="number"
                      min={15}
                      max={480}
                      value={s.duration_minutes}
                      onChange={(e) =>
                        setServices((prev) => {
                          const v = parseInt(e.target.value, 10);
                          const next = [...prev];
                          next[i] = { ...next[i], duration_minutes: Number.isFinite(v) ? Math.max(15, Math.min(480, v)) : 30 };
                          return next;
                        })
                      }
                      className="min-h-[44px] w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 touch-manipulation"
                    />
                    <span className="text-sm text-slate-500">min</span>
                    <button
                      type="button"
                      onClick={() => setServices((prev) => prev.filter((_, j) => j !== i))}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setServices((prev) => [...prev, { id: "", name: "", duration_minutes: 30, enabled: true }])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" /> Add type
                </button>
                <button
                  type="submit"
                  disabled={savingServices || servicesUnchanged}
                  className="min-h-[44px] rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 touch-manipulation sm:py-2"
                >
                  {savingServices ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null} Save
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Chat widget branding: all plans can see; only Elite can customize; Pro/Starter see disabled + upgrade CTA */}
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
                        <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-6 rounded object-contain" />
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
                  Upgrade to Elite or Smart Booking Site
                </Link>
              </>
            )}
            {hasCustomBranding && (
              <form onSubmit={handleSaveBranding} className="mt-4">
                <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label htmlFor="branding-logo" className="block text-sm font-medium text-slate-700">Logo URL</label>
                      <p className="mt-0.5 text-xs text-slate-500">Full URL to your logo image (e.g. https://yoursite.com/logo.png). Shown in the widget header.</p>
                      <input
                        id="branding-logo"
                        type="url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://..."
                        className="mt-1 w-full min-h-[44px] rounded-lg border border-slate-200 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 touch-manipulation sm:text-sm sm:py-2"
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
                          className="min-h-[44px] h-10 w-14 min-w-[3.5rem] cursor-pointer rounded border border-slate-200 touch-manipulation"
                        />
                        <input
                          type="text"
                          value={widgetPrimaryColor}
                          onChange={(e) => setWidgetPrimaryColor(e.target.value)}
                          placeholder="#0d9488"
                          className="flex-1 min-h-[44px] rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-base text-slate-900 touch-manipulation sm:text-sm sm:py-2"
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
                          className="min-h-[44px] h-10 w-14 min-w-[3.5rem] cursor-pointer rounded border border-slate-200 touch-manipulation"
                        />
                        <input
                          type="text"
                          value={widgetBackgroundColor}
                          onChange={(e) => setWidgetBackgroundColor(e.target.value)}
                          placeholder="#f8fafc or leave empty"
                          className="flex-1 min-h-[44px] rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-base text-slate-900 touch-manipulation sm:text-sm sm:py-2"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={savingBranding}
                      className="min-h-[44px] rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 touch-manipulation sm:py-2"
                    >
                      {savingBranding ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null} Save branding
                    </button>
                  </div>
                  <div className="mt-6 lg:mt-0 rounded-xl border border-slate-200 bg-slate-50/50 p-4 lg:sticky lg:top-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</p>
                    <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-slate-200/50">
                      <div
                        className="flex items-center gap-2 border-b border-slate-200 px-2 py-2 transition-[background-color] duration-300 ease-out"
                        style={{ backgroundColor: headerBgHex }}
                      >
                        <span className="relative inline-flex shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic logo with fallback */}
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
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
