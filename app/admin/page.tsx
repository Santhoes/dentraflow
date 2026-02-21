"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { adminFetch } from "@/lib/admin-api";
import { DollarSign, Users, Loader2, Building2, Calendar, MessageSquare, AlertCircle } from "lucide-react";

type GroupBy = "day" | "week" | "month" | "year";

const GROUP_LABELS: Record<GroupBy, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

function formatAxisDate(period: string, groupBy: GroupBy): string {
  if (groupBy === "year") return period;
  if (groupBy === "month") {
    const [y, m] = period.split("-");
    const d = new Date(Number(y), Number(m) - 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  if (groupBy === "week" || groupBy === "day") {
    const d = new Date(period);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return period;
}

type Stats = {
  totalClinics: number;
  appointmentsToday: number;
  supportUnreplied: number;
  plansExpiringSoon: number;
};

export default function AdminDashboardPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [earnings, setEarnings] = useState<{ period: string; total: number }[]>([]);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [patients, setPatients] = useState<{ period: string; count: number }[]>([]);
  const [patientsTotal, setPatientsTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("groupBy", groupBy);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const [earnRes, patRes, statsRes] = await Promise.all([
        adminFetch(`/earnings?${params}`),
        adminFetch(`/patients-booked?${params}`),
        adminFetch("/stats").catch(() => ({ totalClinics: 0, appointmentsToday: 0, supportUnreplied: 0, plansExpiringSoon: 0 })),
      ]);
      setEarnings(earnRes.data ?? []);
      setEarningsTotal(earnRes.total ?? 0);
      setPatients(patRes.data ?? []);
      setPatientsTotal(patRes.total ?? 0);
      setStats(statsRes as Stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setEarnings([]);
      setEarningsTotal(0);
      setPatients([]);
      setPatientsTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!to) {
      const end = new Date();
      setTo(end.toISOString().slice(0, 10));
    }
    if (!from && groupBy === "month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      setFrom(d.toISOString().slice(0, 10));
    }
  }, [groupBy]);

  useEffect(() => {
    load();
  }, [groupBy, from, to]);

  const earningsData = earnings.map((r) => ({
    ...r,
    label: formatAxisDate(r.period, groupBy),
  }));
  const patientsData = patients.map((r) => ({
    ...r,
    label: formatAxisDate(r.period, groupBy),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Earnings and patients booked over time</p>
      </div>

      {stats != null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/clinics"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary/40"
          >
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Building2 className="h-5 w-5" />
              <span className="font-medium">Clinics</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalClinics}</p>
          </Link>
          <Link
            href="/admin/appointments"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary/40"
          >
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Today&apos;s appointments</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.appointmentsToday}</p>
          </Link>
          <Link
            href="/admin/support"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary/40"
          >
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Support unreplied</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.supportUnreplied}</p>
          </Link>
          <Link
            href="/admin/billing"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary/40"
          >
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Plans expiring in 30 days</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.plansExpiringSoon}</p>
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        >
          {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
            <option key={g} value={g}>
              {GROUP_LABELS[g]}
            </option>
          ))}
        </select>
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
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <DollarSign className="h-5 w-5" />
            <span className="font-medium">Total earnings (range)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            ${Number(earningsTotal).toFixed(2)}
          </p>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300 dark:text-slate-500" />
              </div>
            ) : earningsData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                No data — show 0
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-slate-600 dark:text-slate-400" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} className="text-slate-600 dark:text-slate-400" />
                  <Tooltip formatter={(v: number | undefined) => [`$${Number(v ?? 0).toFixed(2)}`, "Earnings"]} />
                  <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Users className="h-5 w-5" />
            <span className="font-medium">Patients booked (range)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{patientsTotal}</p>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300 dark:text-slate-500" />
              </div>
            ) : patientsData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                No data — show 0
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patientsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-slate-600 dark:text-slate-400" />
                  <YAxis tick={{ fontSize: 11 }} className="text-slate-600 dark:text-slate-400" />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
