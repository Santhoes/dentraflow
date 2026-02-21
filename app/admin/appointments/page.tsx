"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppointmentRow {
  id: string;
  clinic_id: string;
  clinic_name?: string;
  patient_name: string | null;
  patient_email: string | null;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

interface ByClinicRow {
  clinic_id: string;
  clinic_name: string;
  count: number;
}

const PAGE_SIZE = 20;

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [byClinic, setByClinic] = useState<ByClinicRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback((p = page) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", String(PAGE_SIZE));
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (clinicId) params.set("clinicId", clinicId);
    adminFetch(`/appointments?${params}`)
      .then((res: { appointments: AppointmentRow[]; byClinic: ByClinicRow[]; total: number }) => {
        setAppointments(res.appointments ?? []);
        setByClinic(res.byClinic ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setAppointments([]);
        setByClinic([]);
      })
      .finally(() => setLoading(false));
  }, [page, from, to, clinicId]);

  useEffect(() => {
    adminFetch("/clinics?limit=500")
      .then((res: { clinics: { id: string; name: string }[] }) => {
        setClinics(res.clinics?.map((c) => ({ id: c.id, name: c.name })) ?? []);
      })
      .catch(() => setClinics([]));
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Appointments</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Appointments per clinic (from Supabase)</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          Clinic
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="">All clinics</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>
        <button
          type="button"
          onClick={() => { setPage(1); load(1); }}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
          <Calendar className="h-4 w-4" />
          Appointments per clinic
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : byClinic.length === 0 ? (
          <p className="py-6 text-center text-slate-500 dark:text-slate-400">No appointments — show 0 or empty</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                  <th className="pb-2 font-semibold text-slate-700 dark:text-slate-300">Clinic</th>
                  <th className="pb-2 font-semibold text-slate-700 dark:text-slate-300">Count</th>
                </tr>
              </thead>
              <tbody>
                {byClinic.map((r) => (
                  <tr key={r.clinic_id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-2 text-slate-900 dark:text-slate-100">{r.clinic_name || r.clinic_id}</td>
                    <td className="py-2 font-medium text-slate-700 dark:text-slate-300">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Appointments list</h2>
        {loading ? null : appointments.length === 0 ? (
          <p className="py-6 text-center text-slate-500 dark:text-slate-400">No appointments</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                    <th className="pb-2 font-semibold text-slate-700 dark:text-slate-300">Clinic</th>
                    <th className="pb-2 font-semibold text-slate-700 dark:text-slate-300">Patient</th>
                    <th className="pb-2 font-semibold text-slate-700 dark:text-slate-300">Start</th>
                    <th className="pb-2 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-2 text-slate-900 dark:text-slate-100">{a.clinic_name || a.clinic_id}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">
                        {a.patient_name || a.patient_email || "—"}
                      </td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{formatDate(a.start_time)}</td>
                      <td className="py-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Page {page} of {totalPages} ({total} total)
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
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium",
                      page >= totalPages ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
    </div>
  );
}
