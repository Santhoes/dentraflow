"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Building2, Loader2, Mail, Plus, Pencil } from "lucide-react";
import { COUNTRIES, PLANS } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface StaffRow {
  email: string;
  role: string;
}

interface ClinicRow {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  plan: string;
  plan_expires_at: string | null;
  phone: string | null;
  working_hours?: Record<string, { open: string; close: string }> | null;
  created_at: string;
  staff: StaffRow[];
}

const PAGE_SIZE = 20;

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ClinicRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    country: "",
    timezone: "America/New_York",
    plan: "starter",
    plan_expires_at: "",
    phone: "",
  });

  const load = useCallback((p = page) => {
    setLoading(true);
    setError(null);
    adminFetch(`/clinics?page=${p}&limit=${PAGE_SIZE}`)
      .then((res: { clinics: ClinicRow[]; total: number }) => {
        setClinics(res.clinics ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setClinics([]);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", country: "", timezone: "America/New_York", plan: "starter", plan_expires_at: "", phone: "" });
    setModal("create");
  };

  const openEdit = (c: ClinicRow) => {
    setEditing(c);
    setForm({
      name: c.name,
      country: c.country || "",
      timezone: c.timezone || "America/New_York",
      plan: c.plan || "starter",
      plan_expires_at: c.plan_expires_at ? c.plan_expires_at.slice(0, 10) : "",
      phone: c.phone || "",
    });
    setModal("edit");
  };

  const saveCreate = async () => {
    if (!form.name.trim() || !form.country.trim()) return;
    setSaving(true);
    try {
      await adminFetch("/clinics", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          country: form.country.trim(),
          timezone: form.timezone,
          plan: form.plan,
          plan_expires_at: form.plan_expires_at.trim() || null,
          phone: form.phone.trim() || null,
        }),
      });
      setModal(null);
      load(1);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminFetch(`/clinics/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          country: form.country.trim(),
          timezone: form.timezone,
          plan: form.plan,
          plan_expires_at: form.plan_expires_at.trim() || null,
          phone: form.phone.trim() || null,
        }),
      });
      setModal(null);
      setEditing(null);
      load(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Clinics & Staff</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Create, edit, and view clinics from Supabase</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Create clinic
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : clinics.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No clinics yet. Create one to get started.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Clinic</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Country</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Plan</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Expires</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Staff</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clinics.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-700 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{c.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{c.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.country || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20">
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {c.plan_expires_at
                          ? new Date(c.plan_expires_at).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {c.staff.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {c.staff.map((s, i) => (
                              <li key={i} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>{s.email}</span>
                                <span className="text-xs text-slate-400">({s.role})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
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
                    page <= 1
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
                    page >= totalPages
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setModal(null)}>
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {modal === "create" ? "Create clinic" : "Edit clinic"}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Clinic name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((co) => (
                    <option key={co} value={co}>{co}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Timezone</label>
                <input
                  type="text"
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="America/New_York"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Plan</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  {PLANS.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Plan expires (optional)</label>
                <input
                  type="date"
                  value={form.plan_expires_at}
                  onChange={(e) => setForm((f) => ({ ...f, plan_expires_at: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone (optional)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !saving && setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={modal === "create" ? saveCreate : saveEdit}
                disabled={saving || !form.name.trim() || !form.country.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : modal === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
