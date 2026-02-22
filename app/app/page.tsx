"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import {
  Settings,
  MapPin,
  Loader2,
  CheckCircle2,
  MessageSquareText,
  Calendar as CalendarIcon,
  Clock,
  XCircle,
  BarChart3,
} from "lucide-react";
import { hasPlanFeature, planAtLeast, normalizePlan } from "@/lib/plan-features";

/** YYYY-MM-DD for a given date. */
function toDateStr(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function getDayRange(dateStr: string): { from: Date; to: Date } {
  const from = new Date(dateStr + "T00:00:00");
  const to = new Date(dateStr + "T23:59:59.999");
  return { from, to };
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function formatDateTimeRange(start: string, end: string): string {
  const dStart = new Date(start);
  const dEnd = new Date(end);
  const datePart = dStart.toLocaleDateString(undefined, { dateStyle: "medium" });
  const startTime = dStart.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const endTime = dEnd.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${startTime} – ${endTime}`;
}

interface DayAppointmentRow {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_id: string;
  reason: string | null;
  patient?: { full_name: string };
}

function getWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { from: monday, to: sunday };
}

export default function AppDashboardPage() {
  const { clinic, refetchClinic } = useApp();
  const [markingComplete, setMarkingComplete] = useState(false);
  const [briefingDate, setBriefingDate] = useState<string>(() => toDateStr(new Date()));
  const [dayList, setDayList] = useState<DayAppointmentRow[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const [briefingRefreshKey, setBriefingRefreshKey] = useState(0);
  const [basicStats, setBasicStats] = useState<{ today: number; week: number } | null>(null);

  const fetchDayAppointments = useCallback(async () => {
    if (!clinic?.id) return;
    setDayLoading(true);
    setDayError(null);
    setDayList([]);
    const { from, to } = getDayRange(briefingDate);
    const supabase = createClient();
    try {
      const { data, error: err } = await supabase
        .from("appointments")
        .select("id, start_time, end_time, status, patient_id, reason")
        .eq("clinic_id", clinic.id)
        .gte("start_time", from.toISOString())
        .lte("start_time", to.toISOString())
        .order("start_time", { ascending: true });
      if (err) {
        setDayError("Failed to load appointments.");
        setDayLoading(false);
        return;
      }
      const rows = (data || []) as DayAppointmentRow[];
      const patientIds = Array.from(new Set(rows.map((a) => a.patient_id).filter(Boolean))) as string[];
      if (patientIds.length === 0) {
        setDayList(rows);
        setDayLoading(false);
        return;
      }
      const { data: patients } = await supabase
        .from("patients")
        .select("id, full_name")
        .in("id", patientIds);
      const map: Record<string, { full_name: string }> = {};
      (patients || []).forEach((p: { id: string; full_name: string }) => {
        map[p.id] = { full_name: p.full_name };
      });
      setDayList(
        rows.map((a) => ({
          ...a,
          patient: a.patient_id ? map[a.patient_id] : undefined,
        }))
      );
    } catch {
      setDayError("Failed to load appointments.");
    } finally {
      setDayLoading(false);
    }
  }, [clinic?.id, briefingDate]);

  useEffect(() => {
    if (!clinic?.id || !hasPlanFeature(clinic.plan, "briefings")) return;
    fetchDayAppointments();
  }, [clinic?.id, clinic?.plan, briefingDate, briefingRefreshKey, fetchDayAppointments]);

  const showBasicAnalytics = clinic && (normalizePlan(clinic.plan) === "starter" || normalizePlan(clinic.plan) === "pro");

  useEffect(() => {
    if (!clinic?.id || !showBasicAnalytics) return;
    const supabase = createClient();
    const todayStr = toDateStr(new Date());
    const { from: todayFrom, to: todayTo } = getDayRange(todayStr);
    const { from: weekFrom, to: weekTo } = getWeekRange();
    Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinic.id)
        .gte("start_time", todayFrom.toISOString())
        .lte("start_time", todayTo.toISOString())
        .in("status", ["pending", "scheduled", "confirmed"]),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinic.id)
        .gte("start_time", weekFrom.toISOString())
        .lte("start_time", weekTo.toISOString())
        .in("status", ["pending", "scheduled", "confirmed"]),
    ]).then(([todayRes, weekRes]) => {
      setBasicStats({
        today: todayRes.count ?? 0,
        week: weekRes.count ?? 0,
      });
    }).catch(() => setBasicStats({ today: 0, week: 0 }));
  }, [clinic?.id, showBasicAnalytics]);

  const showSetupPrompt = clinic && !(clinic as { settings_completed_at?: string | null }).settings_completed_at;

  const handleMarkSetupComplete = async () => {
    if (!clinic) return;
    setMarkingComplete(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/app/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings_completed_at: true }),
      });
      if (res.ok) await refetchClinic();
    } finally {
      setMarkingComplete(false);
    }
  };

  if (!clinic) return null;

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Overview</h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">{clinic.name}</p>
      </div>

      {showBasicAnalytics && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <BarChart3 className="h-5 w-5 text-primary" />
            At a glance
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{basicStats?.today ?? "—"}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-600">Appointments today</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{basicStats?.week ?? "—"}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-600">This week</p>
            </div>
          </div>
          <Link
            href="/app/analytics"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <BarChart3 className="h-4 w-4" /> View full analytics
          </Link>
        </section>
      )}

      {showSetupPrompt && (
        <div className="card-hover rounded-xl border-2 border-primary/30 bg-primary/5 p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Settings className="h-5 w-5 text-primary" />
            Complete your setup
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Fill in clinic details, phone (use a number with WhatsApp for better patient contact), and optional locations so your AI receptionist and analytics work best.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/app/settings/details"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Settings className="h-4 w-4" /> Clinic details
            </Link>
            {planAtLeast(clinic.plan, "pro") && (
              <Link
                href="/app/locations"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <MapPin className="h-4 w-4" /> Locations
              </Link>
            )}
            <Link
              href="/app/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              All settings
            </Link>
            <button
              type="button"
              onClick={handleMarkSetupComplete}
              disabled={markingComplete}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              {markingComplete ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              I&apos;ve completed setup
            </button>
          </div>
        </div>
      )}

      {hasPlanFeature(clinic.plan, "briefings") && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MessageSquareText className="h-5 w-5 text-primary" />
            Daily briefing
          </h2>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <label htmlFor="briefing-date" className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarIcon className="h-4 w-4" />
              Date
            </label>
            <input
              id="briefing-date"
              type="date"
              value={briefingDate}
              onChange={(e) => setBriefingDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setBriefingRefreshKey((k) => k + 1)}
              disabled={dayLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {dayLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Refresh
            </button>
          </div>
          {dayError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50/50 p-3 text-sm text-red-800">
              {dayError}
            </div>
          )}
          {dayLoading && dayList.length === 0 ? (
            <div className="mt-4 flex items-center justify-center rounded-xl border border-slate-100 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/30 p-4">
                <p className="text-slate-700">
                  {dayList.length === 0 && !dayLoading
                    ? `No appointments on ${formatDateLabel(briefingDate).toLowerCase()}.`
                    : dayList.length > 0
                      ? (() => {
                          const scheduled = dayList.filter((a) => a.status !== "completed" && a.status !== "cancelled");
                          const completed = dayList.filter((a) => a.status === "completed");
                          const cancelled = dayList.filter((a) => a.status === "cancelled");
                          const morning = dayList.filter((a) => new Date(a.start_time).getHours() < 12);
                          const afternoon = dayList.filter((a) => new Date(a.start_time).getHours() >= 12);
                          const parts: string[] = [];
                          parts.push(
                            `${formatDateLabel(briefingDate)} you have ${dayList.length} appointment${dayList.length === 1 ? "" : "s"}.`
                          );
                          const statusParts: string[] = [];
                          if (scheduled.length) statusParts.push(`${scheduled.length} scheduled`);
                          if (completed.length) statusParts.push(`${completed.length} completed`);
                          if (cancelled.length) statusParts.push(`${cancelled.length} cancelled`);
                          if (statusParts.length) parts.push(statusParts.join(", ") + ".");
                          if (morning.length || afternoon.length) {
                            const ampm: string[] = [];
                            if (morning.length) ampm.push(`${morning.length} in the morning`);
                            if (afternoon.length) ampm.push(`${afternoon.length} in the afternoon`);
                            parts.push(ampm.join(" and ") + ".");
                          }
                          return parts.join(" ");
                        })()
                      : "Select a date and refresh to see the summary."}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card-hover flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:gap-3 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-10 sm:w-10">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-slate-900 sm:text-xl">{dayList.length}</p>
                    <p className="text-xs text-slate-600">Total</p>
                  </div>
                </div>
                <div className="card-hover flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:gap-3 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 sm:h-10 sm:w-10">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                      {dayList.filter((a) => a.status !== "completed" && a.status !== "cancelled").length}
                    </p>
                    <p className="text-xs text-slate-600">Scheduled</p>
                  </div>
                </div>
                <div className="card-hover flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:gap-3 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 sm:h-10 sm:w-10">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-slate-900 sm:text-xl">{dayList.filter((a) => a.status === "completed").length}</p>
                    <p className="text-xs text-slate-600">Completed</p>
                  </div>
                </div>
                <div className="card-hover flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:gap-3 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 sm:h-10 sm:w-10">
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-slate-900 sm:text-xl">{dayList.filter((a) => a.status === "cancelled").length}</p>
                    <p className="text-xs text-slate-600">Cancelled</p>
                  </div>
                </div>
              </div>
              {dayList.length > 0 && (
                <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
                    <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                      Appointments — {formatDateLabel(briefingDate)}
                    </h3>
                  </div>
                  <div className="overflow-x-auto rounded-b-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                          <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">#</th>
                          <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Date & time</th>
                          <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Patient</th>
                          <th className="px-3 py-2 font-semibold text-slate-900 dark:text-white sm:px-4 sm:py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700 dark:text-slate-200">
                        {dayList.map((a, index) => (
                          <tr key={a.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-600">
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">{index + 1}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300 sm:px-4 sm:py-3">{formatDateTimeRange(a.start_time, a.end_time)}</td>
                            <td className="px-3 py-2 sm:px-4 sm:py-3">{a.patient?.full_name ?? "—"}</td>
                            <td className="px-3 py-2 sm:px-4 sm:py-3">
                              <span
                                className={
                                  a.status === "completed"
                                    ? "rounded-full bg-emerald-600/80 px-2 py-0.5 text-xs font-medium text-white"
                                    : a.status === "cancelled"
                                      ? "rounded-full bg-slate-600 px-2 py-0.5 text-xs font-medium text-slate-200"
                                      : "rounded-full bg-blue-600/80 px-2 py-0.5 text-xs font-medium text-white"
                                }
                              >
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Welcome</h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Use the sidebar to manage <strong>Settings</strong>, <strong>Appointments</strong>, <strong>Patients</strong>, and <strong>Plan & Billing</strong>.
          Your AI receptionist works with the data you set up here.
        </p>
      </div>
    </div>
  );
}
