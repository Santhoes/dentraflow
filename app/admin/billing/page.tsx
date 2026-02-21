"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Loader2, Mail, Send, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BillingRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_expires_at: string | null;
  owner_email: string;
  last_payment: { amount: number; at: string; plan: string } | null;
}

const PAGE_SIZE = 20;

export default function AdminBillingPage() {
  const [billing, setBilling] = useState<BillingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sendingExpired, setSendingExpired] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback((p = page) => {
    setLoading(true);
    setError(null);
    adminFetch(`/billing?page=${p}&limit=${PAGE_SIZE}`)
      .then((res: { billing: BillingRow[]; total: number }) => {
        setBilling(res.billing ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setBilling([]);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const sendReminder = async (clinicId: string) => {
    setSending(clinicId);
    setMessage(null);
    try {
      await adminFetch("/send-reminder", {
        method: "POST",
        body: JSON.stringify({ clinicId }),
      });
      setMessage({ type: "ok", text: "Reminder email sent." });
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Failed to send reminder",
      });
    } finally {
      setSending(null);
    }
  };

  const isExpired = (expiresAt: string | null) =>
    expiresAt && new Date(expiresAt) < new Date();

  const sendPlanExpired = async (clinicId: string) => {
    setSendingExpired(clinicId);
    setMessage(null);
    try {
      await adminFetch("/send-plan-expired", {
        method: "POST",
        body: JSON.stringify({ clinicId }),
      });
      setMessage({ type: "ok", text: "Plan expired email sent." });
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Failed to send plan expired email",
      });
    } finally {
      setSendingExpired(null);
    }
  };

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Billing</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Plans, expiry dates, and send renewal reminder email</p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : billing.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No billing data. Clinics and purchases will appear here.
        </div>
      ) : (
        <>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Clinic</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Plan</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Expiry</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Owner</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Last payment</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {billing.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-700 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{row.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20">
                        {row.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(row.plan_expires_at)}</td>
                    <td className="px-4 py-3">
                      {row.owner_email ? (
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          {row.owner_email}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {row.last_payment ? (
                        <>
                          ${Number(row.last_payment.amount).toFixed(2)} ({row.last_payment.plan}) —{" "}
                          {formatDate(row.last_payment.at)}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => sendReminder(row.id)}
                          disabled={!!sending || !row.owner_email}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50 dark:bg-primary/20 dark:hover:bg-primary/30"
                        >
                          {sending === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Reminder
                        </button>
                        {isExpired(row.plan_expires_at) && (
                          <button
                            type="button"
                            onClick={() => sendPlanExpired(row.id)}
                            disabled={!!sendingExpired || !row.owner_email}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                          >
                            {sendingExpired === row.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            Plan expired email
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {total > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  page <= 1 ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                )}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  page >= Math.ceil(total / PAGE_SIZE) ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
