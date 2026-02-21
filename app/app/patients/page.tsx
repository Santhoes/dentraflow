"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import {
  type PastPeriod,
  PAST_PERIOD_OPTIONS,
  getPastRange,
  getPeriodLabel,
} from "@/lib/date-period";

const PAGE_SIZE = 10;

interface PatientRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

/** Get distinct patient IDs with completed appointment in the given period, most recent first. */
function useCompletedAppointmentPatientIds(
  clinicId: string | undefined,
  period: PastPeriod
) {
  const [patientIds, setPatientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      setPatientIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { from, to } = getPastRange(period);
    const supabase = createClient();
    void Promise.resolve(
      supabase
        .from("appointments")
        .select("patient_id, start_time")
        .eq("clinic_id", clinicId)
        .eq("status", "completed")
        .gte("start_time", from.toISOString())
        .lte("start_time", to.toISOString())
        .order("start_time", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            setPatientIds([]);
            setLoading(false);
            return;
          }
          const rows = (data || []) as { patient_id: string; start_time: string }[];
          const seen = new Set<string>();
          const ordered: string[] = [];
          for (const r of rows) {
            if (r.patient_id && !seen.has(r.patient_id)) {
              seen.add(r.patient_id);
              ordered.push(r.patient_id);
            }
          }
          setPatientIds(ordered);
        })
    ).finally(() => setLoading(false)).catch(() => {
      setPatientIds([]);
      setLoading(false);
    });
  }, [clinicId, period]);

  return { patientIds, loading };
}

export default function AppPatientsPage() {
  const { clinic } = useApp();
  const [period, setPeriod] = useState<PastPeriod>("week");
  const { patientIds, loading: idsLoading } = useCompletedAppointmentPatientIds(
    clinic?.id,
    period
  );
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const totalCount = patientIds.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageIds = useMemo(
    () => patientIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [patientIds, page]
  );

  useEffect(() => {
    setPage(1);
  }, [period]);

  useEffect(() => {
    if (!clinic?.id || pageIds.length === 0) {
      setPatients([]);
      setLoadingPatients(false);
      return;
    }
    setLoadingPatients(true);
    const supabase = createClient();
    void Promise.resolve(
      supabase
        .from("patients")
        .select("id, full_name, email, phone, created_at")
        .eq("clinic_id", clinic.id)
        .in("id", pageIds)
        .then(({ data, error }) => {
          if (error) {
            setPatients([]);
            return;
          }
          const list = (data || []) as PatientRow[];
          const orderMap: Record<string, number> = {};
          pageIds.forEach((id, i) => (orderMap[id] = i));
          list.sort((a, b) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0));
          setPatients(list);
        })
    ).finally(() => setLoadingPatients(false)).catch(() => setPatients([]));
  }, [clinic?.id, pageIds.join(",")]);

  const formatDate = useCallback(
    (s: string) =>
      new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" }),
    []
  );

  const handleDownloadPdf = useCallback(async () => {
    if (!clinic || patientIds.length === 0) return;
    setDownloadingPdf(true);
    try {
      const supabase = createClient();
      const batchSize = 200;
      const orderMap: Record<string, number> = {};
      patientIds.forEach((id, idx) => (orderMap[id] = idx));
      const allPatients: PatientRow[] = [];
      for (let i = 0; i < patientIds.length; i += batchSize) {
        const chunk = patientIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("patients")
          .select("id, full_name, email, phone, created_at")
          .eq("clinic_id", clinic.id)
          .in("id", chunk);
        if (error) throw error;
        const list = (data || []) as PatientRow[];
        list.sort((a, b) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0));
        allPatients.push(...list);
      }
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Patients with completed appointments", 14, 20);
      doc.setFontSize(10);
      doc.text(
        `${clinic.name} — ${getPeriodLabel(period)} (${totalCount} patients)`,
        14,
        28
      );
      autoTable(doc, {
        startY: 34,
        head: [["Name", "Email", "Phone", "Added"]],
        body: allPatients.map((p) => [
          p.full_name,
          p.email ?? "—",
          p.phone ?? "—",
          formatDate(p.created_at),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [71, 85, 105] },
      });
      doc.save(
        `patients-completed-${getPeriodLabel(period).replace(/\s+/g, "-")}.pdf`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingPdf(false);
    }
  }, [clinic, period, patientIds, totalCount, formatDate]);

  if (!clinic) return null;

  const loading = idsLoading || loadingPatients;

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Patients</h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">
          Patients with completed appointments. Filter by period and download the
          list as PDF.
        </p>
      </div>

      <div className="card-hover flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-4">
        <label
          htmlFor="patients-period"
          className="text-sm font-medium text-slate-700"
        >
          Show:
        </label>
        <select
          id="patients-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as PastPeriod)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {PAST_PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {totalCount} patient{totalCount !== 1 ? "s" : ""} with completed
          appointment{totalCount !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloadingPdf || totalCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {downloadingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No patients with completed appointments in this period.
        </div>
      ) : (
        <>
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 sm:px-4 sm:py-3">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 sm:px-4 sm:py-3">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 sm:px-4 sm:py-3">
                      Phone
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 sm:px-4 sm:py-3">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      <td className="px-3 py-2 font-medium text-slate-900 sm:px-4 sm:py-3">
                        {p.full_name}
                      </td>
                      <td className="px-3 py-2 text-slate-600 sm:px-4 sm:py-3">
                        {p.email ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 sm:px-4 sm:py-3">
                        {p.phone ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 sm:px-4 sm:py-3">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
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
        </>
      )}
    </div>
  );
}
