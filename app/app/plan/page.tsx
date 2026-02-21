"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import { PLANS, COUNTRIES, type PlanId } from "@/lib/supabase/types";
import { getPlanLimit, formatPlanLimit } from "@/lib/plan-features";
import { computePriceWithTax } from "@/lib/tax-by-country";
import { type FilterPeriod, PERIOD_OPTIONS, getRange, getPeriodLabel } from "@/lib/date-period";

const PAGE_SIZE = 10;
const RENEW_STORAGE_KEY = "dentraflow_renew_plan";
const RENEW_COUNTRY_STORAGE_KEY = "dentraflow_renew_payer_country";

interface PaymentRow {
  id: string;
  amount: number;
  plan: string;
  created_at: string;
  status: string;
  tax_amount?: number | null;
  country?: string | null;
}

export default function AppPlanPage() {
  const { clinic, refetchClinic } = useApp();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<FilterPeriod>("month");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planChangeSuccess, setPlanChangeSuccess] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [payerCountry, setPayerCountry] = useState<string>("");

  useEffect(() => {
    if (!clinic?.id) return;
    setLoading(true);
    const supabase = createClient();
    const { from, to } = getRange(period);
    const fromRow = (page - 1) * PAGE_SIZE;
    let q = supabase
      .from("payments")
      .select("id, amount, plan, created_at, status, tax_amount, country", { count: "exact" })
      .eq("clinic_id", clinic.id)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .range(fromRow, fromRow + PAGE_SIZE - 1);
    void Promise.resolve(
      q.then(({ data, count, error }) => {
        if (error) {
          setPayments([]);
          setTotalCount(0);
          return;
        }
        setPayments((data as PaymentRow[]) || []);
        setTotalCount(count ?? 0);
      })
    ).finally(() => setLoading(false)).catch(() => {
      setPayments([]);
      setTotalCount(0);
      setLoading(false);
    });
  }, [clinic?.id, page, period]);

  useEffect(() => {
    if (clinic?.country) setPayerCountry((prev) => prev || clinic.country || "");
  }, [clinic?.country]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data: { country?: string | null }) => {
        const detected = data?.country;
        if (!detected || !COUNTRIES.includes(detected)) return;
        setPayerCountry(detected);
      })
      .catch(() => {});
  }, []);

  // Handle return from PayPal renewal
  useEffect(() => {
    if (typeof window === "undefined" || !clinic?.id) return;
    const params = new URLSearchParams(window.location.search);
    const renew = params.get("renew");
    const orderId = params.get("token") || params.get("orderId");
    if (renew !== "1" || !orderId) return;

    const plan = sessionStorage.getItem(RENEW_STORAGE_KEY) || clinic.plan;
    const savedPayerCountry = sessionStorage.getItem(RENEW_COUNTRY_STORAGE_KEY);
    sessionStorage.removeItem(RENEW_STORAGE_KEY);
    sessionStorage.removeItem(RENEW_COUNTRY_STORAGE_KEY);
    window.history.replaceState({}, "", "/app/plan");

    setRenewing(true);
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (!session?.access_token) {
          setToast({ message: "Session expired. Please log in again.", type: "error" });
          setRenewing(false);
          return;
        }
        return fetch("/api/payments/capture-renewal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            orderId,
            plan,
            country: savedPayerCountry || undefined,
          }),
        });
      })
      .then((r) => (r?.ok ? r.json() : r?.json().then((d) => ({ error: d?.error || "Capture failed" }))))
      .then((data) => {
        if (data?.error) {
          const msg = (data as { error?: string }).error || "Failed to change plan.";
          setToast({ message: msg, type: "error" });
        } else if (data?.success) {
          refetchClinic();
          setPlanChangeSuccess(true);
          setTimeout(() => setPlanChangeSuccess(false), 4000);
        }
      })
      .catch(() => setToast({ message: "Failed to change plan.", type: "error" }))
      .finally(() => setRenewing(false));
  }, [clinic?.id, clinic?.plan, refetchClinic]);

  const handleRenew = useCallback(async () => {
    if (!clinic || !clinic.plan) return;
    const planInfo = PLANS.find((p) => p.id === clinic.plan);
    if (!planInfo || planInfo.priceCents === 0) return;

    setRenewing(true);
    setToast(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) {
        setToast({ message: "Please log in again.", type: "error" });
        setRenewing(false);
        return;
      }
      sessionStorage.setItem(RENEW_STORAGE_KEY, clinic.plan);
      sessionStorage.setItem(RENEW_COUNTRY_STORAGE_KEY, payerCountry || clinic.country || "");
      const res = await fetch("/api/payments/create-renewal-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: clinic.plan, country: payerCountry || clinic.country || undefined }),
      });
      const data = await res.json();
      if (data.error || !data.approvalUrl) {
        setToast({ message: data.error || "Could not start renewal", type: "error" });
        setRenewing(false);
        return;
      }
      window.location.href = data.approvalUrl;
    } catch {
      setToast({ message: "Something went wrong. Please try again.", type: "error" });
      setRenewing(false);
    }
  }, [clinic, payerCountry]);

  const handleSubscribePlan = useCallback(
    async (planId: PlanId) => {
      if (!clinic) return;
      const planInfo = PLANS.find((p) => p.id === planId);
      if (!planInfo || planInfo.priceCents === 0) return;

      setSubscribingPlanId(planId);
      setToast(null);
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session?.access_token) {
          setToast({ message: "Please log in again.", type: "error" });
          setSubscribingPlanId(null);
          return;
        }
        sessionStorage.setItem(RENEW_STORAGE_KEY, planId);
        sessionStorage.setItem(RENEW_COUNTRY_STORAGE_KEY, payerCountry || clinic.country || "");
        const res = await fetch("/api/payments/create-renewal-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan: planId, country: payerCountry || clinic.country || undefined }),
        });
        const data = await res.json();
        if (data.error || !data.approvalUrl) {
          setToast({ message: data.error || "Failed to change plan.", type: "error" });
          setSubscribingPlanId(null);
          return;
        }
        window.location.href = data.approvalUrl;
      } catch {
        setToast({ message: "Failed to change plan.", type: "error" });
        setSubscribingPlanId(null);
      }
    },
    [clinic, payerCountry]
  );

  const handleDownloadPdf = useCallback(async () => {
    if (!clinic || totalCount === 0) return;
    setDownloadingPdf(true);
    try {
      const { from, to } = getRange(period);
      const supabase = createClient();
      const allRows: PaymentRow[] = [];
      let offset = 0;
      const batchSize = 500;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("payments")
          .select("id, amount, plan, created_at, status, tax_amount")
          .eq("clinic_id", clinic.id)
          .gte("created_at", from.toISOString())
          .lte("created_at", to.toISOString())
          .order("created_at", { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        const rows = (data || []) as PaymentRow[];
        allRows.push(...rows);
        hasMore = rows.length === batchSize;
        offset += batchSize;
      }
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Previous charges", 14, 20);
      doc.setFontSize(10);
      doc.text(
        `${clinic.name} — ${getPeriodLabel(period)} (${allRows.length} payments)`,
        14,
        28
      );
      autoTable(doc, {
        startY: 34,
        head: [["Date", "Plan", "Amount", "Tax", "Status"]],
        body: allRows.map((p) => [
          new Date(p.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }),
          p.plan,
          `$${Number(p.amount).toFixed(2)}`,
          p.tax_amount != null && p.tax_amount > 0 ? `$${Number(p.tax_amount).toFixed(2)}` : "—",
          p.status,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [71, 85, 105] },
      });
      doc.save(
        `charges-${getPeriodLabel(period).replace(/\s+/g, "-")}.pdf`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingPdf(false);
    }
  }, [clinic, period, totalCount]);

  if (!clinic) return null;

  const planInfo = PLANS.find((p) => p.id === clinic.plan);
  const expiry = clinic.plan_expires_at ? new Date(clinic.plan_expires_at) : null;
  const isExpired = expiry ? expiry < new Date() : false;
  const canRenew =
    clinic.plan &&
    planInfo &&
    planInfo.priceCents > 0 &&
    expiry != null &&
    isExpired;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Plan & Billing</h1>
        <p className="mt-1 text-slate-600">
          Current plan, expiry, renew or change plan, and payment history.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Current plan</p>
              <p className="text-2xl font-bold text-primary">{planInfo?.name ?? clinic.plan}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">{planInfo?.description}</p>
          <button
            type="button"
            onClick={() => { setShowPlanModal(true); setToast(null); }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4" />
            Change plan
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Plan expiry</p>
              <p className={`text-lg font-medium ${isExpired ? "text-red-600" : "text-slate-900"}`}>
                {expiry ? expiry.toLocaleDateString(undefined, { dateStyle: "long" }) : "No expiry"}
              </p>
              {isExpired && <p className="text-sm text-red-600">Renew to keep your AI receptionist active.</p>}
            </div>
          </div>
          {canRenew && planInfo && (() => {
            const withTax = computePriceWithTax(planInfo.priceCents, payerCountry || (clinic.country ?? ""));
            return (
              <div className="mt-4 space-y-2">
                <div>
                  <label htmlFor="plan-payer-country" className="block text-xs font-medium text-slate-600">Payer country (for tax)</label>
                  <select
                    id="plan-payer-country"
                    value={payerCountry || clinic.country || ""}
                    onChange={(e) => setPayerCountry(e.target.value)}
                    className="mt-0.5 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {withTax.taxRatePercent > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-600">
                    <p>Subtotal: ${(withTax.subtotalCents / 100).toFixed(2)} · Tax ({withTax.taxRatePercent}%): ${(withTax.taxCents / 100).toFixed(2)} · Total: ${(withTax.totalCents / 100).toFixed(2)}/mo</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRenew}
                  disabled={renewing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 sm:w-auto"
                >
                  {renewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Renew plan
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-semibold text-slate-900">Your plan limits</p>
        <p className="mt-0.5 text-sm text-slate-600">Clinics, AI agents, and chat widgets included in your plan.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Clinics / branches</dt>
            <dd className="mt-0.5 text-lg font-semibold text-slate-900">
              {formatPlanLimit(getPlanLimit(clinic.plan, "locations"))}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">AI agents</dt>
            <dd className="mt-0.5 text-lg font-semibold text-slate-900">
              {formatPlanLimit(getPlanLimit(clinic.plan, "aiAgents"))}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Chat widgets</dt>
            <dd className="mt-0.5 text-lg font-semibold text-slate-900">
              {formatPlanLimit(getPlanLimit(clinic.plan, "chatWidgets"))}
            </dd>
          </div>
        </dl>
      </div>

      {planChangeSuccess && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" /> Plan changed successfully.
          </p>
        </div>
      )}

      {/* Toast: bottom-right for payment errors */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[100] flex max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg ${
            toast.type === "error" ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
          }`}
          role="alert"
        >
          <p className={`flex-1 text-sm font-medium ${toast.type === "error" ? "text-red-800" : "text-emerald-800"}`}>
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Change plan modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Change plan</h3>
              <button
                type="button"
                onClick={() => { setShowPlanModal(false); setToast(null); }}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div className="mb-3">
                  <label htmlFor="modal-payer-country" className="block text-xs font-medium text-slate-600">Payer country (for tax)</label>
                  <select
                    id="modal-payer-country"
                    value={payerCountry || clinic.country || ""}
                    onChange={(e) => setPayerCountry(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {PLANS.map((plan) => {
                  const isCurrent = plan.id === clinic.plan;
                  const isSubscribing = subscribingPlanId === plan.id;
                  const withTax = computePriceWithTax(plan.priceCents, payerCountry || (clinic.country ?? ""));
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-lg border p-4 ${
                        isCurrent ? "border-primary/30 bg-primary/5" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{plan.name}</p>
                          <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
                          <p className="mt-2 text-sm font-medium text-slate-700">
                            ${(withTax.totalCents / 100).toFixed(2)}/month
                            {withTax.taxRatePercent > 0 && (
                              <span className="ml-1 font-normal text-slate-500">
                                (incl. {withTax.taxRatePercent}% tax)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                              <Check className="h-3.5 w-3.5" /> Current plan
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSubscribePlan(plan.id)}
                              disabled={!!subscribingPlanId}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                            >
                              {isSubscribing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : null}
                              Subscribe
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => { setShowPlanModal(false); setToast(null); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Previous charges</h2>
        <p className="mt-1 text-sm text-slate-600">Filter by period and download as PDF.</p>

        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <label htmlFor="billing-period" className="text-sm font-medium text-slate-700">
            Show:
          </label>
          <select
            id="billing-period"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as FilterPeriod);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">
            {totalCount} payment{totalCount !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || totalCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
        </div>

        <div className="mt-4 min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">#</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Date</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Plan</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Amount</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Tax</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 sm:px-4 sm:py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 sm:px-4 sm:py-8">
                    No payments in this period.
                  </td>
                </tr>
              ) : (
                payments.map((p, index) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-600">
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      {new Date(p.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">{p.plan}</td>
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-3">${Number(p.amount).toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">
                      {p.tax_amount != null && p.tax_amount > 0 ? `$${Number(p.tax_amount).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">{p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
