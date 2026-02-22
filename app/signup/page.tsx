"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  SIGNUP_STORAGE_KEY,
  PLANS,
  COUNTRIES,
  type SignupTempData,
  type PlanId,
} from "@/lib/supabase/types";
import { computePriceWithTax } from "@/lib/tax-by-country";
import { Check, Loader2 } from "lucide-react";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
];

function loadTemp(): Partial<SignupTempData> | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(SIGNUP_STORAGE_KEY);
    return s ? (JSON.parse(s) as Partial<SignupTempData>) : null;
  } catch {
    return null;
  }
}

function saveTemp(data: Partial<SignupTempData>) {
  const prev = loadTemp() || {};
  const next = { ...prev, ...data };
  localStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(next));
}

function clearTemp() {
  localStorage.removeItem(SIGNUP_STORAGE_KEY);
}

function SignupContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0] || "");
  const [timezone, setTimezone] = useState("America/New_York");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  const supabase = createClient();

  const persistAndNext = useCallback((nextStep: number) => {
    const prev = loadTemp() || {};
    saveTemp({
      ...prev,
      email,
      password: password || prev.password,
      clinicName,
      country,
      timezone,
      whatsapp_phone: whatsappPhone,
      plan: selectedPlan || undefined,
    });
    setStep(nextStep);
    setError(null);
  }, [email, password, clinicName, country, timezone, whatsappPhone, selectedPlan]);

  useEffect(() => {
    const temp = loadTemp();
    if (temp?.email) setEmail(temp.email);
    if (temp?.password) setPassword(temp.password);
    if (temp?.clinicName) setClinicName(temp.clinicName);
    if (temp?.country) setCountry(temp.country);
    if (temp?.timezone) setTimezone(temp.timezone);
    if (temp?.whatsapp_phone) setWhatsappPhone(temp.whatsapp_phone ?? "");
    if (temp?.plan) setSelectedPlan(temp.plan as PlanId);
  }, []);

  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data: { country?: string | null }) => {
        const detected = data?.country;
        if (!detected || !COUNTRIES.includes(detected)) return;
        const fromTemp = loadTemp()?.country;
        if (fromTemp) return;
        setCountry(detected);
      })
      .catch(() => {});
  }, []);

  const planParam = searchParams.get("plan") as PlanId | null;
  useEffect(() => {
    if (planParam && PLANS.some((p) => p.id === planParam)) setSelectedPlan(planParam);
  }, [planParam]);

  const success = searchParams.get("success");
  const orderId = searchParams.get("token") || searchParams.get("orderId");
  const cancelled = searchParams.get("cancelled");

  useEffect(() => {
    if (cancelled === "1") {
      setError("Payment was cancelled. You can try again.");
      return;
    }
    if (success === "1" && orderId) {
      const temp = loadTemp();
      if (!temp?.email || !temp?.password || !temp?.clinicName || !temp?.country || !temp?.plan || !temp?.whatsapp_phone?.trim()) {
        setError("Missing signup data. Please start over.");
        return;
      }
      setLoading(true);
      setError(null);
      supabase.auth.signUp({ email: temp.email, password: temp.password })
        .then(({ data: { user }, error: signUpErr }) => {
          if (signUpErr) {
            if (signUpErr.message?.toLowerCase().includes("already registered")) {
              setError("Email is already taken. Please log in.");
            } else {
              setError(signUpErr.message);
            }
            setLoading(false);
            return;
          }
          if (!user) {
            setError("Could not create account.");
            setLoading(false);
            return;
          }
          return supabase.auth.getSession();
        })
        .then((sessionRes) => {
          if (!sessionRes?.data?.session?.access_token) return;
          const temp2 = loadTemp();
          if (!temp2?.clinicName || !temp2?.country || !temp2?.plan) return;
          const planPrice = PLANS.find((p) => p.id === temp2.plan)?.priceCents ?? 0;
          const { totalCents, taxCents } = computePriceWithTax(planPrice, temp2.country ?? "");
          return fetch("/api/payments/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionRes.data.session.access_token}` },
            body: JSON.stringify({
              orderId,
              plan: temp2.plan,
              amountCents: totalCents,
              taxCents,
              clinicName: temp2.clinicName,
              country: temp2.country,
              timezone: temp2.timezone,
              whatsapp_phone: temp2.whatsapp_phone?.trim() || undefined,
              workingHours: temp2.workingHours || undefined,
            }),
          });
        })
        .then((r) => (r?.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          if (data.error) {
            setError(data.error);
            setLoading(false);
            return;
          }
          clearTemp();
          window.location.href = `/app?welcome=1&clinic=${data.slug || data.clinicId}`;
        })
        .catch(() => setError("Something went wrong. Please try again."))
        .finally(() => setLoading(false));
    }
  }, [success, orderId, cancelled, supabase.auth]);

  const handleStep1 = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const check = await checkRes.json();
      if (check.exists) {
        setError("Email is already taken.");
        setLoading(false);
        return;
      }
      saveTemp({ email: email.trim(), password });
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanAndPay = async () => {
    if (!selectedPlan) {
      setError("Please select a plan.");
      return;
    }
    const planInfo = PLANS.find((p) => p.id === selectedPlan);
    if (!planInfo) return;
    const { totalCents, taxCents } = computePriceWithTax(planInfo.priceCents, country);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, amountCents: totalCents }),
      });
      const data = await res.json();
      if (data.error || !data.approvalUrl) {
        setError(data.error || "Could not start payment");
        setLoading(false);
        return;
      }
      saveTemp({ plan: selectedPlan, clinicName, country, timezone, whatsapp_phone: whatsappPhone, email, password });
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        setError("Payment link not available. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  if (success === "1" && orderId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-soft sm:p-8">
          {loading ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-slate-600">Completing your signup…</p>
            </>
          ) : error ? (
            <>
              <p className="text-red-600">{error}</p>
              <Button className="mt-4" asChild>
                <Link href="/signup">Start over</Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] overflow-x-hidden px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center gap-2 sm:mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full ${step >= s ? "bg-primary" : "bg-slate-200"}`}
            />
          ))}
        </div>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8"
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="you@clinic.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="At least 6 characters"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="button" className="min-h-[44px] w-full touch-manipulation" onClick={handleStep1} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clinic details</h1>
                <p className="text-sm text-slate-600">Tell us about your practice.</p>
                <div>
                  <label htmlFor="clinicName" className="block text-sm font-medium text-slate-700">Practice name</label>
                  <input
                    id="clinicName"
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Your Dental Clinic"
                  />
                </div>
                <p className="text-xs text-slate-500">Country for billing &amp; tax is auto-detected from your location.</p>
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">Timezone</label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="whatsappPhone" className="block text-sm font-medium text-slate-700">WhatsApp number *</label>
                  <p className="mt-0.5 text-xs text-slate-500">Required for reminders and booking notifications. Include country code (e.g. +1 234 567 8900).</p>
                  <input
                    id="whatsappPhone"
                    type="tel"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    required
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="min-h-[44px] flex-1 touch-manipulation" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="min-h-[44px] flex-1 touch-manipulation"
                    disabled={!clinicName.trim() || !country.trim() || !whatsappPhone.trim()}
                    onClick={() => {
                      if (!clinicName.trim() || !country.trim()) {
                        setError("Practice name and country are required.");
                        return;
                      }
                      if (!whatsappPhone.trim()) {
                        setError("WhatsApp number is required.");
                        return;
                      }
                      setError(null);
                      persistAndNext(3);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Choose a plan</h1>
                <p className="text-sm text-slate-600">You can change this later.</p>
                <p className="text-xs text-slate-500">
                  Prices shown for {country || "your country"}. Tax may apply at checkout.
                </p>
                <div className="space-y-3">
                  {PLANS.map((plan) => {
                    const withTax = computePriceWithTax(plan.priceCents, country);
                    const showTax = withTax.taxRatePercent > 0;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`w-full min-h-[44px] rounded-xl border p-4 text-left transition-all touch-manipulation ${
                          selectedPlan === plan.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{plan.name}</p>
                            <p className="text-sm text-slate-600">{plan.description}</p>
                            {showTax && (
                              <p className="mt-1 text-xs text-slate-500">
                                ${(withTax.subtotalCents / 100).toFixed(2)} + {withTax.taxRatePercent}% tax = ${(withTax.totalCents / 100).toFixed(2)}/mo
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              ${(withTax.totalCents / 100).toFixed(2)}/mo
                            </span>
                            {selectedPlan === plan.id && <Check className="h-5 w-5 text-primary" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="min-h-[44px] flex-1 touch-manipulation" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="min-h-[44px] flex-1 touch-manipulation"
                    onClick={() => {
                      if (!selectedPlan) {
                        setError("Please select a plan.");
                        return;
                      }
                      persistAndNext(4);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment</h1>
                {selectedPlan && (() => {
                  const planInfo = PLANS.find((p) => p.id === selectedPlan);
                  if (!planInfo) return null;
                  const withTax = computePriceWithTax(planInfo.priceCents, country);
                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm">
                      <p className="font-medium text-slate-900">Total for payer&apos;s country ({country})</p>
                      <p className="mt-0.5 text-xs text-slate-500">Country and tax are auto-detected from your location or the country you selected.</p>
                      <div className="mt-2 space-y-0.5 text-slate-600">
                        <p>Subtotal: ${(withTax.subtotalCents / 100).toFixed(2)}/mo</p>
                        {withTax.taxRatePercent > 0 && (
                          <p>Tax ({withTax.taxRatePercent}%): ${(withTax.taxCents / 100).toFixed(2)}</p>
                        )}
                        <p className="font-semibold text-slate-900">Total: ${(withTax.totalCents / 100).toFixed(2)}/mo</p>
                      </div>
                      <p className="mt-2 text-slate-600">Complete payment with PayPal to activate your clinic.</p>
                    </div>
                  );
                })()}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="min-h-[44px] flex-1 touch-manipulation" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="min-h-[44px] flex-1 touch-manipulation"
                    onClick={handlePlanAndPay}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay with PayPal"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <SignupContent />
    </Suspense>
  );
}
