"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { getGoogleCalendarUrl } from "@/lib/google-calendar";
import Link from "next/link";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  CalendarCheck,
  Download,
} from "lucide-react";
import {
  type UpcomingPeriod,
  type PastPeriod,
  UPCOMING_PERIOD_OPTIONS,
  PAST_PERIOD_OPTIONS,
  getUpcomingRange,
  getPastRange,
  getPeriodLabel,
} from "@/lib/date-period";

const PAGE_SIZE = 10;

interface AppointmentRow {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_id: string;
  reason: string | null;
  patient?: { full_name: string; email: string | null };
}

function useUpcomingAppointments(
  clinicId: string | undefined,
  period: UpcomingPeriod,
  page: number
) {
  const [list, setList] = useState<AppointmentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      setList([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    const { from, to } = getUpcomingRange(period);
    setLoading(true);
    const supabase = createClient();
    const fromRow = (page - 1) * PAGE_SIZE;
    let q = supabase
      .from("appointments")
      .select("id, start_time, end_time, status, patient_id, reason", { count: "exact" })
      .eq("clinic_id", clinicId)
      .gte("start_time", from.toISOString())
      .lte("start_time", to.toISOString())
      .order("start_time", { ascending: true })
      .range(fromRow, fromRow + PAGE_SIZE - 1);

    void Promise.resolve(
      q.then(({ data, count, error }) => {
        if (error) {
          setList([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
        const rows = (data || []) as AppointmentRow[];
        setTotalCount(count ?? 0);
        const patientIds = Array.from(
          new Set(rows.map((a) => a.patient_id).filter(Boolean))
        );
        if (patientIds.length === 0) {
          setList(rows);
          setLoading(false);
          return;
        }
        return supabase
          .from("patients")
          .select("id, full_name, email")
          .in("id", patientIds)
          .then(({ data: patients }) => {
            const map: Record<
              string,
              { full_name: string; email: string | null }
            > = {};
            (patients || []).forEach(
              (p: { id: string; full_name: string; email: string | null }) => {
                map[p.id] = { full_name: p.full_name, email: p.email };
              }
            );
            setList(
              rows.map((a) => ({
                ...a,
                patient: a.patient_id ? map[a.patient_id] : undefined,
              }))
            );
          });
      })
    )
      .finally(() => setLoading(false))
      .catch(() => {
        setList([]);
        setTotalCount(0);
        setLoading(false);
      });
  }, [clinicId, period, page]);

  return { list, totalCount, loading };
}

function usePastAppointments(
  clinicId: string | undefined,
  period: PastPeriod,
  page: number
) {
  const [list, setList] = useState<AppointmentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      setList([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    const { from, to } = getPastRange(period);
    setLoading(true);
    const supabase = createClient();
    const fromRow = (page - 1) * PAGE_SIZE;
    let q = supabase
      .from("appointments")
      .select("id, start_time, end_time, status, patient_id, reason", { count: "exact" })
      .eq("clinic_id", clinicId)
      .gte("start_time", from.toISOString())
      .lte("start_time", to.toISOString())
      .order("start_time", { ascending: false })
      .range(fromRow, fromRow + PAGE_SIZE - 1);

    void Promise.resolve(
      q.then(({ data, count, error }) => {
        if (error) {
          setList([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
        const rows = (data || []) as AppointmentRow[];
        setTotalCount(count ?? 0);
        const patientIds = Array.from(
          new Set(rows.map((a) => a.patient_id).filter(Boolean))
        );
        if (patientIds.length === 0) {
          setList(rows);
          setLoading(false);
          return;
        }
        return supabase
          .from("patients")
          .select("id, full_name, email")
          .in("id", patientIds)
          .then(({ data: patients }) => {
            const map: Record<
              string,
              { full_name: string; email: string | null }
            > = {};
            (patients || []).forEach(
              (p: { id: string; full_name: string; email: string | null }) => {
                map[p.id] = { full_name: p.full_name, email: p.email };
              }
            );
            setList(
              rows.map((a) => ({
                ...a,
                patient: a.patient_id ? map[a.patient_id] : undefined,
              }))
            );
          });
      })
    )
      .finally(() => setLoading(false))
      .catch(() => {
        setList([]);
        setTotalCount(0);
        setLoading(false);
      });
  }, [clinicId, period, page]);

  return { list, totalCount, loading };
}

/** Open each URL in a new tab with a short delay to avoid popup blocking. */
function openAllToGoogleCalendar(urls: string[]) {
  urls.forEach((url, i) => {
    setTimeout(() => window.open(url, "_blank", "noopener"), i * 400);
  });
}

export default function AppAppointmentsPage() {
  const { clinic } = useApp();
  const [upcomingPeriod, setUpcomingPeriod] = useState<UpcomingPeriod>("week");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPeriod, setPastPeriod] = useState<PastPeriod>("week");
  const [pastPage, setPastPage] = useState(1);
  const [downloadingCompletedPdf, setDownloadingCompletedPdf] = useState(false);

  const {
    list: upcomingList,
    totalCount: upcomingTotal,
    loading: upcomingLoading,
  } = useUpcomingAppointments(clinic?.id, upcomingPeriod, upcomingPage);

  const {
    list: pastList,
    totalCount: pastTotal,
    loading: pastLoading,
  } = usePastAppointments(clinic?.id, pastPeriod, pastPage);

  const formatDate = useCallback(
    (s: string) =>
      new Date(s).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      }),
    []
  );

  /** Single cell: date and time range (e.g. "20 Feb 2025, 9:00 – 10:00"). */
  const formatDateTimeRange = useCallback((start: string, end: string) => {
    const dStart = new Date(start);
    const dEnd = new Date(end);
    const datePart = dStart.toLocaleDateString(undefined, { dateStyle: "medium" });
    const startTime = dStart.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const endTime = dEnd.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return `${datePart}, ${startTime} – ${endTime}`;
  }, []);

  const handleDownloadCompletedPdf = useCallback(async () => {
    if (!clinic) return;
    setDownloadingCompletedPdf(true);
    try {
      const { from, to } = getPastRange(pastPeriod);
      const supabase = createClient();
      const allRows: AppointmentRow[] = [];
      const batchSize = 500;
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("appointments")
          .select("id, start_time, end_time, status, patient_id, reason")
          .eq("clinic_id", clinic.id)
          .gte("start_time", from.toISOString())
          .lte("start_time", to.toISOString())
          .order("start_time", { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        const rows = (data || []) as AppointmentRow[];
        allRows.push(...rows);
        hasMore = rows.length === batchSize;
        offset += batchSize;
      }
      const patientIds = Array.from(
        new Set(allRows.map((a) => a.patient_id).filter(Boolean))
      );
      const patientMap: Record<string, { full_name: string }> = {};
      if (patientIds.length > 0) {
        for (let i = 0; i < patientIds.length; i += 200) {
          const chunk = patientIds.slice(i, i + 200);
          const { data: patients } = await supabase
            .from("patients")
            .select("id, full_name")
            .in("id", chunk);
          (patients || []).forEach(
            (p: { id: string; full_name: string }) => {
              patientMap[p.id] = { full_name: p.full_name };
            }
          );
        }
      }
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Completed appointments", 14, 20);
      doc.setFontSize(10);
      doc.text(
        `${clinic.name} — ${getPeriodLabel(pastPeriod)} (${allRows.length} appointments)`,
        14,
        28
      );
      const dateTimeRange = (start: string, end: string) => {
        const dStart = new Date(start);
        const dEnd = new Date(end);
        const datePart = dStart.toLocaleDateString(undefined, { dateStyle: "medium" });
        const startTime = dStart.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        const endTime = dEnd.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        return `${datePart}, ${startTime} – ${endTime}`;
      };
      autoTable(doc, {
        startY: 34,
        head: [["Patient", "Date & time", "Reason", "Status"]],
        body: allRows.map((a) => [
          a.patient_id ? (patientMap[a.patient_id]?.full_name ?? "—") : "—",
          dateTimeRange(a.start_time, a.end_time),
          a.reason?.trim() || "—",
          a.status,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [71, 85, 105] },
      });
      doc.save(
        `completed-appointments-${getPeriodLabel(pastPeriod).replace(/\s+/g, "-")}.pdf`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingCompletedPdf(false);
    }
  }, [clinic, pastPeriod, formatDate]);

  const handleAddAllUpcomingToCalendar = useCallback(() => {
    if (!clinic) return;
    const now = new Date();
    const urls = upcomingList
      .filter((a) => {
        const start = new Date(a.start_time);
        return (
          start > now &&
          a.status !== "completed" &&
          a.status !== "cancelled"
        );
      })
      .map((a) => {
        const start = new Date(a.start_time);
        const end = new Date(a.end_time);
        return getGoogleCalendarUrl({
          title: `Dental — ${a.patient?.full_name || "Patient"}`,
          start,
          end,
          description: clinic.name,
        });
      });
    if (urls.length === 0) return;
    openAllToGoogleCalendar(urls);
  }, [clinic, upcomingList]);

  const upcomingAddableCount = upcomingList.filter((a) => {
    const start = new Date(a.start_time);
    const now = new Date();
    return (
      start > now &&
      a.status !== "completed" &&
      a.status !== "cancelled"
    );
  }).length;

  if (!clinic) return null;

  const upcomingPages = Math.max(
    1,
    Math.ceil(upcomingTotal / PAGE_SIZE)
  );
  const pastPages = Math.max(1, Math.ceil(pastTotal / PAGE_SIZE));

  return (
    <div className="responsive-stack space-y-6 sm:space-y-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Appointments</h1>
      </div>

      {/* ——— Upcoming ——— */}
      <section className="card-hover min-w-0 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CalendarPlus className="h-5 w-5 text-emerald-600" />
            Upcoming appointments
          </h2>
          <label htmlFor="upcoming-period" className="text-sm font-medium text-slate-700">
            Show:
          </label>
          <select
            id="upcoming-period"
            value={upcomingPeriod}
            onChange={(e) => {
              setUpcomingPeriod(e.target.value as UpcomingPeriod);
              setUpcomingPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {UPCOMING_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">
            {upcomingTotal} appointment{upcomingTotal !== 1 ? "s" : ""}
          </span>
          {upcomingAddableCount > 0 && (
            <button
              type="button"
              onClick={handleAddAllUpcomingToCalendar}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <CalendarPlus className="h-4 w-4" />
              Add all upcoming to Google Calendar
            </button>
          )}
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Date & time = when the appointment is. Reason = cause or purpose of the visit (e.g. cleaning, check-up).
        </p>
        <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">#</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Patient</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Date & time</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Reason</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-200">
              {upcomingLoading ? (
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 sm:px-4 sm:py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : upcomingList.length === 0 ? (
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 sm:px-4 sm:py-8">
                    No upcoming appointments in this period.
                  </td>
                </tr>
              ) : (
                upcomingList.map((a, index) => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-100 last:border-b-0 dark:border-slate-600"
                  >
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">
                      {(upcomingPage - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">{a.patient?.full_name ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">
                      {formatDateTimeRange(a.start_time, a.end_time)}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">
                      {a.reason?.trim() || "—"}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
          <p className="text-sm text-slate-600">
            Page {upcomingPage} of {upcomingPages} ({upcomingTotal} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}
              disabled={upcomingPage <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setUpcomingPage((p) => Math.min(upcomingPages, p + 1))
              }
              disabled={upcomingPage >= upcomingPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ——— Completed ——— */}
      <section className="card-hover min-w-0 rounded-xl border border-slate-200 bg-slate-50/30 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CalendarCheck className="h-5 w-5 text-slate-500" />
            Completed appointments
          </h2>
          <label htmlFor="past-period" className="text-sm font-medium text-slate-700">
            Show:
          </label>
          <select
            id="past-period"
            value={pastPeriod}
            onChange={(e) => {
              setPastPeriod(e.target.value as PastPeriod);
              setPastPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {PAST_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">
            {pastTotal} appointment{pastTotal !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={handleDownloadCompletedPdf}
            disabled={downloadingCompletedPdf || pastTotal === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {downloadingCompletedPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PDF
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Date & time = when the appointment is. Reason = cause or purpose of the visit (e.g. cleaning, check-up).
        </p>
        <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">#</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Patient</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Date & time</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Reason</th>
                <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-200">
              {pastLoading ? (
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 sm:px-4 sm:py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : pastList.length === 0 ? (
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400 sm:px-4 sm:py-8">
                    No completed appointments in this period.
                  </td>
                </tr>
              ) : (
                pastList.map((a, index) => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-100 last:border-b-0 dark:border-slate-600"
                  >
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">
                      {(pastPage - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">{a.patient?.full_name ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">
                      {formatDateTimeRange(a.start_time, a.end_time)}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">
                      {a.reason?.trim() || "—"}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
          <p className="text-sm text-slate-600">
            Page {pastPage} of {pastPages} ({pastTotal} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPastPage((p) => Math.max(1, p - 1))}
              disabled={pastPage <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPastPage((p) => Math.min(pastPages, p + 1))}
              disabled={pastPage >= pastPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
