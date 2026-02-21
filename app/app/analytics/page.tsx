"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BarChart3, TrendingUp, Calendar, Users, Zap, Crown, Download, FileText } from "lucide-react";
import { hasPlanFeature, normalizePlan } from "@/lib/plan-features";
import { getRange, getPeriodLabel, getPreviousRange, PERIOD_OPTIONS, type FilterPeriod } from "@/lib/date-period";
import { PLANS } from "@/lib/supabase/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

export default function AppAnalyticsPage() {
  const { clinic } = useApp();
  const [period, setPeriod] = useState<FilterPeriod>("month");
  const [stats, setStats] = useState<{
    appointments: number;
    completed: number;
    cancelled: number;
    patients: number;
  } | null>(null);
  const [byDay, setByDay] = useState<number[]>([]);
  const [byReason, setByReason] = useState<{ reason: string; count: number }[]>([]);
  const [repeatStats, setRepeatStats] = useState<{ totalPatients: number; repeatPatients: number } | null>(null);
  const [byHour, setByHour] = useState<number[]>([]);
  const [bookingsByDate, setBookingsByDate] = useState<{ date: string; count: number; label: string }[]>([]);
  const [byLocation, setByLocation] = useState<{ locationId: string | null; locationName: string; count: number }[]>([]);
  const [noShowCount, setNoShowCount] = useState<number>(0);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [revenuePrevious, setRevenuePrevious] = useState<number | null>(null);
  const [estimatedRevenue, setEstimatedRevenue] = useState<number | null>(null);
  const [estimatedRevenuePrevious, setEstimatedRevenuePrevious] = useState<number | null>(null);
  const [previousStats, setPreviousStats] = useState<{
    appointments: number;
    completed: number;
    cancelled: number;
    patients: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const showAdvanced = hasPlanFeature(clinic?.plan ?? null, "advancedAnalytics");
  const showEliteInsights = hasPlanFeature(clinic?.plan ?? null, "advancedInsights");

  useEffect(() => {
    if (!clinic?.id) return;
    setLoading(true);
    const supabase = createClient();
    const { from, to } = getRange(period);

    Promise.all([
      supabase
        .from("appointments")
        .select("status")
        .eq("clinic_id", clinic.id)
        .gte("start_time", from.toISOString())
        .lte("start_time", to.toISOString()),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinic.id)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),
    ])
      .then(([apptRes, patientsRes]) => {
        const list = (apptRes.data || []) as { status: string }[];
        const completed = list.filter((r) => r.status === "completed").length;
        const cancelled = list.filter((r) => r.status === "cancelled").length;
        const patientsCount = patientsRes.error == null && patientsRes.count != null ? patientsRes.count : 0;
        setStats({
          appointments: list.length,
          completed,
          cancelled,
          patients: patientsCount,
        });
      })
      .catch(() => setStats({ appointments: 0, completed: 0, cancelled: 0, patients: 0 }))
      .finally(() => setLoading(false));
  }, [clinic?.id, period]);

  useEffect(() => {
    if (!clinic?.id || !showAdvanced) {
      setByDay([]);
      setByReason([]);
      setRepeatStats(null);
      setByHour([]);
      setBookingsByDate([]);
      setByLocation([]);
      setNoShowCount(0);
      return;
    }
    setAdvancedLoading(true);
    const { from, to } = getRange(period);
    const supabase = createClient();
    void Promise.all([
      supabase
        .from("clinic_locations")
        .select("id, name")
        .eq("clinic_id", clinic.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("appointments")
        .select("start_time, reason, patient_id, status, location_id")
        .eq("clinic_id", clinic.id)
        .gte("start_time", from.toISOString())
        .lte("start_time", to.toISOString()),
    ]).then(([locRes, apptRes]) => {
      const locations = (locRes.data || []) as { id: string; name: string }[];
      const locationNames: Record<string, string> = {};
      locations.forEach((loc) => {
        locationNames[loc.id] = loc.name;
      });
      const list = (apptRes.data || []) as {
          start_time: string;
          reason: string | null;
          patient_id: string | null;
          status: string;
          location_id: string | null;
        }[];
        const now = new Date();
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        const hourCounts = Array.from({ length: 24 }, () => 0);
        const dateMap: Record<string, number> = {};
        const reasonMap: Record<string, number> = {};
        const patientCounts: Record<string, number> = {};
        const locationCounts: Record<string, number> = {};
        let missed = 0;
        list.forEach((r) => {
          const d = new Date(r.start_time);
          dayCounts[d.getDay()]++;
          hourCounts[d.getHours()]++;
          const dateKey = r.start_time.slice(0, 10);
          dateMap[dateKey] = (dateMap[dateKey] ?? 0) + 1;
          const label = (r.reason?.trim() || "Not specified");
          reasonMap[label] = (reasonMap[label] ?? 0) + 1;
          if (r.patient_id) {
            patientCounts[r.patient_id] = (patientCounts[r.patient_id] ?? 0) + 1;
          }
          const locKey = r.location_id ?? "__primary__";
          locationCounts[locKey] = (locationCounts[locKey] ?? 0) + 1;
          if (d < now && r.status !== "completed" && r.status !== "cancelled") {
            missed++;
          }
        });
        setByDay(dayCounts);
        setByHour(hourCounts);
        setNoShowCount(missed);
        const locationRows: { locationId: string | null; locationName: string; count: number }[] = [];
        locationRows.push({ locationId: null, locationName: clinic.name + " (Primary)", count: locationCounts["__primary__"] ?? 0 });
        locations.forEach((loc) => {
          locationRows.push({ locationId: loc.id, locationName: loc.name, count: locationCounts[loc.id] ?? 0 });
        });
        setByLocation(locationRows);
        setBookingsByDate(
          Object.entries(dateMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({
              date,
              count,
              label: new Date(date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            }))
        );
        setByReason(
          Object.entries(reasonMap)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
        );
        const totalPatients = Object.keys(patientCounts).length;
        const repeatPatients = Object.values(patientCounts).filter((c) => c >= 2).length;
        setRepeatStats({ totalPatients, repeatPatients });
    })
      .catch(() => {
        setByDay([]);
        setByReason([]);
        setRepeatStats(null);
        setByHour([]);
        setBookingsByDate([]);
        setByLocation([]);
        setNoShowCount(0);
      })
      .finally(() => setAdvancedLoading(false));
  }, [clinic?.id, period, showAdvanced]);

  useEffect(() => {
    if (!clinic?.id || !showAdvanced) {
      setPreviousStats(null);
      return;
    }
    const { from, to } = getPreviousRange(period);
    const supabase = createClient();
    Promise.all([
      supabase
        .from("appointments")
        .select("status")
        .eq("clinic_id", clinic.id)
        .gte("start_time", from.toISOString())
        .lte("start_time", to.toISOString()),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinic.id)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),
    ])
      .then(([apptRes, patientsRes]) => {
        const list = (apptRes.data || []) as { status: string }[];
        const completed = list.filter((r) => r.status === "completed").length;
        const cancelled = list.filter((r) => r.status === "cancelled").length;
        const patientsCount = patientsRes.error == null && patientsRes.count != null ? patientsRes.count : 0;
        setPreviousStats({
          appointments: list.length,
          completed,
          cancelled,
          patients: patientsCount,
        });
      })
      .catch(() => setPreviousStats(null));
  }, [clinic?.id, period, showAdvanced]);

  useEffect(() => {
    if (!clinic?.id || !showEliteInsights) {
      setRevenue(null);
      setRevenuePrevious(null);
      return;
    }
    const { from, to } = getRange(period);
    const prev = getPreviousRange(period);
    const supabase = createClient();
    Promise.all([
      supabase
        .from("payments")
        .select("amount")
        .eq("clinic_id", clinic.id)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),
      supabase
        .from("payments")
        .select("amount")
        .eq("clinic_id", clinic.id)
        .gte("created_at", prev.from.toISOString())
        .lte("created_at", prev.to.toISOString()),
    ])
      .then(([currRes, prevRes]) => {
        const currList = (currRes.data || []) as { amount: number }[];
        const prevList = (prevRes.data || []) as { amount: number }[];
        setRevenue(currList.reduce((s, r) => s + Number(r.amount), 0));
        setRevenuePrevious(prevList.reduce((s, r) => s + Number(r.amount), 0));
      })
      .catch(() => {
        setRevenue(null);
        setRevenuePrevious(null);
      });
  }, [clinic?.id, period, showEliteInsights]);

  const defaultCharge = (clinic as { default_appointment_charge?: number | null } | null)?.default_appointment_charge ?? null;

  useEffect(() => {
    if (!clinic?.id || defaultCharge == null || defaultCharge <= 0) {
      setEstimatedRevenue(null);
      setEstimatedRevenuePrevious(null);
      return;
    }
    const { from, to } = getRange(period);
    const prev = getPreviousRange(period);
    const supabase = createClient();
    Promise.all([
      supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("status", "completed")
        .gte("start_time", from.toISOString())
        .lte("start_time", to.toISOString()),
      supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("status", "completed")
        .gte("start_time", prev.from.toISOString())
        .lte("start_time", prev.to.toISOString()),
    ])
      .then(([currRes, prevRes]) => {
        const currCount = (currRes.data || []).length;
        const prevCount = (prevRes.data || []).length;
        setEstimatedRevenue(currCount * defaultCharge);
        setEstimatedRevenuePrevious(prevCount * defaultCharge);
      })
      .catch(() => {
        setEstimatedRevenue(null);
        setEstimatedRevenuePrevious(null);
      });
  }, [clinic?.id, period, defaultCharge]);

  const total = stats?.appointments ?? 0;
  const completionRate = total > 0 ? (((stats?.completed ?? 0) / total) * 100).toFixed(1) : "0";
  const cancellationRate = total > 0 ? (((stats?.cancelled ?? 0) / total) * 100).toFixed(1) : "0";
  const repeatVisitRate =
    repeatStats && repeatStats.totalPatients > 0
      ? ((repeatStats.repeatPatients / repeatStats.totalPatients) * 100).toFixed(1)
      : "0";

  const handleExportPdf = useCallback(async () => {
    if (!clinic) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      const periodLabel = getPeriodLabel(period);
      doc.setFontSize(16);
      doc.text("Analytics report", 14, 20);
      doc.setFontSize(10);
      doc.text(`${clinic.name} — ${periodLabel}`, 14, 28);
      let y = 36;
      doc.setFontSize(11);
      doc.text("Overview", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
          ["Total bookings", String(stats?.appointments ?? 0)],
          ["Completed", String(stats?.completed ?? 0)],
          ["Cancelled", String(stats?.cancelled ?? 0)],
          ["New patients", String(stats?.patients ?? 0)],
          ["Completion rate", `${completionRate}%`],
          ["Cancellation rate", `${cancellationRate}%`],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [71, 85, 105] },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      if (showAdvanced && (byDay.some((n) => n > 0) || byReason.length > 0 || repeatStats)) {
        doc.setFontSize(11);
        doc.text("Advanced", 14, y);
        y += 6;
        if (repeatStats) {
          autoTable(doc, {
            startY: y,
            head: [["Repeat visits", ""]],
            body: [
              ["Patients with 2+ visits", `${repeatStats.repeatPatients} of ${repeatStats.totalPatients}`],
              ["Repeat visit rate", `${repeatVisitRate}%`],
            ],
            styles: { fontSize: 9 },
            headStyles: { fillColor: [71, 85, 105] },
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
        if (byLocation.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [["Location", "Bookings"]],
            body: byLocation.map((r) => [r.locationName, String(r.count)]),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [71, 85, 105] },
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
        if (byDay.some((n) => n > 0)) {
          autoTable(doc, {
            startY: y,
            head: [["Day", "Bookings"]],
            body: DAY_NAMES.map((day, i) => [day, String(byDay[i] ?? 0)]),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [71, 85, 105] },
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
        if (byReason.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [["Reason / treatment", "Count"]],
            body: byReason.map((r) => [r.reason, String(r.count)]),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [71, 85, 105] },
          });
        }
      }
      doc.save(`analytics-${periodLabel.replace(/\s+/g, "-")}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setExportingPdf(false);
    }
  }, [clinic, period, stats, completionRate, cancellationRate, showAdvanced, byDay, byReason, byLocation, repeatStats, repeatVisitRate]);

  const handleExportCsv = useCallback(() => {
    if (!clinic) return;
    setExportingCsv(true);
    try {
      const periodLabel = getPeriodLabel(period);
      const rows: string[][] = [
        ["Analytics", clinic.name, periodLabel],
        [],
        ["Overview", "", ""],
        ["Metric", "Value", ""],
        ["Total bookings", String(stats?.appointments ?? 0), ""],
        ["Completed", String(stats?.completed ?? 0), ""],
        ["Cancelled", String(stats?.cancelled ?? 0), ""],
        ["New patients", String(stats?.patients ?? 0), ""],
        ["Completion rate", `${completionRate}%`, ""],
        ["Cancellation rate", `${cancellationRate}%`, ""],
      ];
      if (showAdvanced && byLocation.length > 0) {
        rows.push([], ["Bookings by location", "", ""]);
        rows.push(["Location", "Bookings", ""]);
        byLocation.forEach((r) => rows.push([r.locationName, String(r.count), ""]));
      }
      if (showAdvanced && repeatStats) {
        rows.push([], ["Repeat visits", "", ""]);
        rows.push(["Patients with 2+ visits", String(repeatStats.repeatPatients), ""]);
        rows.push(["Total patients (with visits)", String(repeatStats.totalPatients), ""]);
        rows.push(["Repeat visit rate", `${repeatVisitRate}%`, ""]);
      }
      if (showAdvanced && byDay.some((n) => n > 0)) {
        rows.push([], ["Bookings by day", "", ""]);
        rows.push(["Day", "Bookings", ""]);
        DAY_NAMES.forEach((day, i) => rows.push([day, String(byDay[i] ?? 0), ""]));
      }
      if (showAdvanced && byReason.length > 0) {
        rows.push([], ["Treatment / reason breakdown", "", ""]);
        rows.push(["Reason", "Count", ""]);
        byReason.forEach((r) => rows.push([r.reason, String(r.count), ""]));
      }
      const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${periodLabel.replace(/\s+/g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
    }
  }, [clinic, period, stats, completionRate, cancellationRate, showAdvanced, byDay, byReason, byLocation, repeatStats, repeatVisitRate]);

  if (!clinic) return null;

  const plan = normalizePlan(clinic.plan);
  const planInfo = PLANS.find((p) => p.id === plan);
  const busiestDayIndex = byDay.length ? byDay.indexOf(Math.max(...byDay)) : -1;
  const noShowRate = total > 0 ? ((noShowCount / total) * 100).toFixed(1) : "0";
  const revenueTrend =
    revenue != null && revenuePrevious != null && revenuePrevious > 0
      ? (((revenue - revenuePrevious) / revenuePrevious) * 100).toFixed(1)
      : null;
  const prevLabel =
    period === "today"
      ? "Yesterday"
      : period === "yesterday"
        ? "2 days ago"
        : period === "week"
          ? "Last week"
          : period === "month"
            ? "Last month"
            : "Last year";

  function pctChange(current: number, previous: number): string {
    if (previous === 0) return current === 0 ? "0%" : "—";
    return `${(((current - previous) / previous) * 100).toFixed(1)}%`;
  }

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Analytics</h1>
          <p className="mt-1 text-slate-600">
            {plan === "elite"
              ? "Full analytics and insights for your Elite plan."
              : plan === "pro"
                ? "Basic and advanced booking analytics for your Pro plan."
                : "Basic booking analytics. Upgrade for advanced insights."}
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

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="analytics-period" className="text-sm font-medium text-slate-700">
          Period:
        </label>
        <select
          id="analytics-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {exportingPdf ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Export PDF
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exportingCsv}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {exportingCsv ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </button>
      </div>

      {/* Basic stats — all plans */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {plan === "starter" ? "Basic analytics" : "Overview"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{loading ? "…" : stats?.appointments ?? 0}</p>
                <p className="text-sm text-slate-600">Bookings ({getPeriodLabel(period)})</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{loading ? "…" : stats?.completed ?? 0}</p>
                <p className="text-sm text-slate-600">Completed</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{loading ? "…" : stats?.cancelled ?? 0}</p>
                <p className="text-sm text-slate-600">Cancelled</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{loading ? "…" : stats?.patients ?? 0}</p>
                <p className="text-sm text-slate-600">New patients ({getPeriodLabel(period)})</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Estimated revenue from default appointment charge (all plans when set) */}
      {defaultCharge != null && defaultCharge > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            <TrendingUp className="h-4 w-4" />
            Estimated revenue (from appointment charge)
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs text-slate-500 mb-3">
              Completed appointments × default charge (${Number(defaultCharge).toFixed(2)}) in Settings.
            </p>
            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">This period ({getPeriodLabel(period)})</p>
                <p className="text-2xl font-bold text-slate-900">
                  {estimatedRevenue != null ? `$${estimatedRevenue.toFixed(2)}` : "…"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Previous period ({prevLabel})</p>
                <p className="text-xl font-semibold text-slate-700">
                  {estimatedRevenuePrevious != null ? `$${estimatedRevenuePrevious.toFixed(2)}` : "…"}
                </p>
              </div>
              {estimatedRevenue != null && estimatedRevenuePrevious != null && estimatedRevenuePrevious > 0 && (
                <span
                  className={
                    ((estimatedRevenue - estimatedRevenuePrevious) / estimatedRevenuePrevious) >= 0
                      ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
                      : "rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                  }
                >
                  Trend {((estimatedRevenue - estimatedRevenuePrevious) / estimatedRevenuePrevious * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Elite: Revenue by period and trend (payments table) */}
      {showEliteInsights && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-700">
            <TrendingUp className="h-4 w-4" />
            Revenue by period and trend
          </h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-6">
            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">This period ({getPeriodLabel(period)})</p>
                <p className="text-2xl font-bold text-slate-900">
                  {revenue != null ? `$${revenue.toFixed(2)}` : "…"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Previous period ({prevLabel})</p>
                <p className="text-xl font-semibold text-slate-700">
                  {revenuePrevious != null ? `$${revenuePrevious.toFixed(2)}` : "…"}
                </p>
              </div>
              {revenueTrend != null && (
                <span
                  className={
                    Number(revenueTrend) >= 0
                      ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
                      : "rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                  }
                >
                  Trend {Number(revenueTrend) >= 0 ? "+" : ""}{revenueTrend}%
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Starter: summary table + upgrade CTA */}
      {plan === "starter" && (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
              <table className="w-full max-w-md text-sm">
                <thead>
                  <tr className="border-b border-slate-600 text-left">
                    <th className="px-4 py-3 font-semibold text-white">Metric</th>
                    <th className="px-4 py-3 font-semibold text-white">Value</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  <tr className="border-b border-slate-600">
                    <td className="px-4 py-3 text-slate-300">Total bookings</td>
                    <td className="px-4 py-3">{loading ? "…" : stats?.appointments ?? 0}</td>
                  </tr>
                  <tr className="border-b border-slate-600">
                    <td className="px-4 py-3 text-slate-300">Completed</td>
                    <td className="px-4 py-3">{loading ? "…" : stats?.completed ?? 0}</td>
                  </tr>
                  <tr className="border-b border-slate-600">
                    <td className="px-4 py-3 text-slate-300">Cancelled</td>
                    <td className="px-4 py-3">{loading ? "…" : stats?.cancelled ?? 0}</td>
                  </tr>
                  <tr className="border-b border-slate-600">
                    <td className="px-4 py-3 text-slate-300">New patients</td>
                    <td className="px-4 py-3">{loading ? "…" : stats?.patients ?? 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
            <h2 className="font-semibold text-slate-900">Upgrade for Advanced Analytics</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pro and Elite plans include: busiest days, cancellation rate, completion rate, and (Elite) revenue insights.
            </p>
            <Link
              href="/app/plan"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              View plans
            </Link>
          </div>
        </>
      )}

      {/* Pro / Elite: Advanced analytics */}
      {showAdvanced && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <TrendingUp className="h-4 w-4" />
            Advanced analytics {plan === "elite" ? "(Pro + Elite)" : "(Pro)"}
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Rates ({getPeriodLabel(period)})</p>
              <p className="mt-1 text-slate-600">
                Completion rate: <strong>{completionRate}%</strong> · Cancellation rate: <strong>{cancellationRate}%</strong>
              </p>
            </div>
            {/* Bookings by location (Pro/Elite with multiple clinics) */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Bookings by location</p>
              <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600 text-left">
                      <th className="px-4 py-3 font-semibold text-white">Location</th>
                      <th className="px-4 py-3 font-semibold text-white">Bookings</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {advancedLoading ? (
                      <tr className="border-b border-slate-600">
                        <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                          Loading…
                        </td>
                      </tr>
                    ) : (
                      byLocation.map((row) => (
                        <tr key={row.locationId ?? "primary"} className="border-b border-slate-600 last:border-b-0">
                          <td className="px-4 py-3 text-slate-300">{row.locationName}</td>
                          <td className="px-4 py-3">{row.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-slate-500">Primary = main clinic. Branches show bookings attributed to each location.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Busiest day</p>
              <p className="mt-1 text-slate-600">
                {advancedLoading
                  ? "…"
                  : busiestDayIndex >= 0
                    ? `${DAY_NAMES[busiestDayIndex]} (${byDay[busiestDayIndex]} bookings)`
                    : "No data for this period."}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Patient retention (repeat visit rate)</p>
              <p className="mt-1 text-slate-600">
                {advancedLoading
                  ? "…"
                  : repeatStats
                    ? `${repeatVisitRate}% — ${repeatStats.repeatPatients} of ${repeatStats.totalPatients} patients had 2+ visits in this period`
                    : "No data for this period."}
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600 text-left">
                    <th className="px-4 py-3 font-semibold text-white">Day</th>
                    <th className="px-4 py-3 font-semibold text-white">Bookings</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {advancedLoading ? (
                    <tr className="border-b border-slate-600">
                      <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  ) : (
                    DAY_NAMES.map((day, i) => (
                      <tr key={day} className="border-b border-slate-600 last:border-b-0">
                        <td className="px-4 py-3 text-slate-300">{day}</td>
                        <td className="px-4 py-3">{byDay[i] ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Treatment / reason breakdown</p>
              <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600 text-left">
                      <th className="px-4 py-3 font-semibold text-white">Reason / treatment</th>
                      <th className="px-4 py-3 font-semibold text-white">Count</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {advancedLoading ? (
                      <tr className="border-b border-slate-600">
                        <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                          Loading…
                        </td>
                      </tr>
                    ) : byReason.length === 0 ? (
                      <tr className="border-b border-slate-600">
                        <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                          No reason data for this period. Add reasons when creating appointments.
                        </td>
                      </tr>
                    ) : (
                      byReason.map((r) => (
                        <tr key={r.reason} className="border-b border-slate-600 last:border-b-0">
                          <td className="px-4 py-3 text-slate-300">{r.reason}</td>
                          <td className="px-4 py-3">{r.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Period comparison */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Period comparison</p>
              <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600 text-left">
                      <th className="px-4 py-3 font-semibold text-white">Metric</th>
                      <th className="px-4 py-3 font-semibold text-white">This period</th>
                      <th className="px-4 py-3 font-semibold text-white">{prevLabel}</th>
                      <th className="px-4 py-3 font-semibold text-white">Change</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {advancedLoading || previousStats == null ? (
                      <tr className="border-b border-slate-600">
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                          Loading…
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr className="border-b border-slate-600">
                          <td className="px-4 py-3 text-slate-300">Bookings</td>
                          <td className="px-4 py-3">{stats?.appointments ?? 0}</td>
                          <td className="px-4 py-3">{previousStats.appointments}</td>
                          <td className="px-4 py-3">{pctChange(stats?.appointments ?? 0, previousStats.appointments)}</td>
                        </tr>
                        <tr className="border-b border-slate-600">
                          <td className="px-4 py-3 text-slate-300">Completed</td>
                          <td className="px-4 py-3">{stats?.completed ?? 0}</td>
                          <td className="px-4 py-3">{previousStats.completed}</td>
                          <td className="px-4 py-3">{pctChange(stats?.completed ?? 0, previousStats.completed)}</td>
                        </tr>
                        <tr className="border-b border-slate-600">
                          <td className="px-4 py-3 text-slate-300">New patients</td>
                          <td className="px-4 py-3">{stats?.patients ?? 0}</td>
                          <td className="px-4 py-3">{previousStats.patients}</td>
                          <td className="px-4 py-3">{pctChange(stats?.patients ?? 0, previousStats.patients)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bookings over time */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Bookings over time</p>
              <div className="h-64 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {advancedLoading || bookingsByDate.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    {advancedLoading ? "Loading…" : "No data for this period."}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bookingsByDate} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="var(--color-primary, #0d9488)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* No-show rate and recovery metrics */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">No-show rate and recovery metrics</p>
              <p className="mt-1 text-slate-600">
                {advancedLoading
                  ? "…"
                  : `Missed / no-show: ${noShowCount} appointments (${noShowRate}% of ${total} in period). Past appointments that were not completed or cancelled count as missed.`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Recovery: automated reminders for no-shows are available on Elite (no-show recovery).
              </p>
            </div>

            {/* Peak hours and busiest times */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Peak hours and busiest times</p>
              <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600 text-left">
                      <th className="px-4 py-3 font-semibold text-white">Hour</th>
                      <th className="px-4 py-3 font-semibold text-white">Bookings</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {advancedLoading ? (
                      <tr className="border-b border-slate-600">
                        <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                          Loading…
                        </td>
                      </tr>
                    ) : (
                      HOUR_LABELS.map((hour, i) => (
                        <tr key={hour} className="border-b border-slate-600 last:border-b-0">
                          <td className="px-4 py-3 text-slate-300">{hour}</td>
                          <td className="px-4 py-3">{byHour[i] ?? 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!advancedLoading && byHour.some((n) => n > 0) && (
                <div className="mt-3 h-48 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={HOUR_LABELS.map((hour, i) => ({ hour, count: byHour[i] ?? 0 }))}
                      margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-primary, #0d9488)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
