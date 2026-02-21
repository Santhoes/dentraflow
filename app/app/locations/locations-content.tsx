"use client";

import React from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  CalendarX2,
} from "lucide-react";
import { COUNTRIES, TIMEZONES } from "@/lib/supabase/types";
import { formatPlanLimit } from "@/lib/plan-features";
import type {
  ClinicLocation,
  LocationFormState,
  HolidayFormState,
  HolidayItem,
} from "./locations-types";

export interface LocationsMainContentClinic {
  name: string;
  phone?: string | null;
  timezone?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
  working_hours?: Record<string, { open: string; close: string } | null> | null;
  accepts_insurance?: boolean;
  insurance_notes?: string | null;
}

export interface LocationsMainContentProps {
  clinic: LocationsMainContentClinic;
  locations: ClinicLocation[];
  loading: boolean;
  totalLocations: number;
  limit: number | null;
  formatPlanLimit: (limit: number | null) => string;
  formatPrimaryAddress: (clinic: LocationsMainContentClinic) => string;
  formatAddress: (loc: ClinicLocation) => string;
  openPrimaryEdit: () => void;
  openEdit: (loc: ClinicLocation) => void;
  deleteLocation: (id: string) => void;
  deletingId: string | null;
  openAdd: () => void;
  canAddMore: boolean;
  canAccess: boolean;
  atLimit: boolean;
  holidays: HolidayItem[];
  holidayForm: HolidayFormState;
  setHolidayForm: React.Dispatch<React.SetStateAction<HolidayFormState>>;
  addHoliday: () => void;
  addingHoliday: boolean;
  deleteHoliday: (id: string) => void;
  deletingHolidayId: string | null;
  modalOpen: "add" | "edit" | null;
  form: LocationFormState;
  setForm: React.Dispatch<React.SetStateAction<LocationFormState>>;
  setModalOpen: React.Dispatch<React.SetStateAction<"add" | "edit" | null>>;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  editingId: string | null;
  saveLocation: () => void;
  saving: boolean;
  resetForm: () => void;
  locationFormError: string | null;
  clearLocationFormError: () => void;
  primaryEditOpen: boolean;
  primaryForm: LocationFormState;
  setPrimaryForm: React.Dispatch<React.SetStateAction<LocationFormState>>;
  savePrimary: () => void;
  setPrimaryEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
  primarySaving: boolean;
  COUNTRIES: readonly string[];
  TIMEZONES: readonly string[];
  DAYS: readonly string[];
  DAY_LABELS: Record<string, string>;
}

export function LocationsMainContent(props: LocationsMainContentProps) {
  const {
    clinic,
    locations,
    loading,
    totalLocations,
    limit,
    formatPlanLimit: formatPlanLimitProp,
    formatPrimaryAddress,
    formatAddress,
    openPrimaryEdit,
    openEdit,
    deleteLocation,
    deletingId,
    openAdd,
    canAddMore,
    canAccess,
    atLimit,
    holidays,
    holidayForm,
    setHolidayForm,
    addHoliday,
    addingHoliday,
    deleteHoliday,
    deletingHolidayId,
    modalOpen,
    form,
    setForm,
    setModalOpen,
    setEditingId,
    editingId,
    saveLocation,
    saving,
    resetForm,
    locationFormError,
    clearLocationFormError,
    primaryEditOpen,
    primaryForm,
    setPrimaryForm,
    savePrimary,
    setPrimaryEditOpen,
    primarySaving,
    COUNTRIES: COUNTRIESProp,
    TIMEZONES: TIMEZONESProp,
    DAYS,
    DAY_LABELS,
  } = props;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Clinics</h1>
          <p className="mt-1 text-slate-600">
            {canAccess
              ? "Manage branches. Each clinic has its own chat embed so the AI books appointments for that place."
              : "Your clinic details. Edit address and contact info below. Upgrade to add more branches."}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-sm text-slate-500">
            {totalLocations} / {formatPlanLimitProp(limit)} {totalLocations === 1 ? "clinic" : "clinics"}
          </span>
        </div>
      </div>
      {/* Primary location (clinic) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
          <h2 className="font-semibold text-slate-900">{canAccess ? "Your clinics" : "Your clinic"}</h2>
          <p className="text-sm text-slate-600">
            {canAccess
              ? "Primary is your main clinic. Add branches below. Add AI agents and copy chat embed from the AI Agents page."
              : "Main clinic address and contact. Used for reminders and booking."}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-start gap-4 p-4 sm:px-6 sm:py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{clinic.name}</p>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Primary</span>
                <button
                  type="button"
                  onClick={openPrimaryEdit}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Edit primary location"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">{formatPrimaryAddress(clinic)}</p>
              {((clinic as { whatsapp_phone?: string | null }).whatsapp_phone || clinic.timezone) && (
                <p className="text-sm text-slate-500">
                  {[(clinic as { whatsapp_phone?: string | null }).whatsapp_phone, clinic.timezone].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {canAccess && (
            <>
              {loading ? (
                <div className="flex items-center gap-2 p-6 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading branches…
                </div>
              ) : (
                locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6 sm:py-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{loc.name}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{formatAddress(loc)}</p>
                      {(loc.phone || loc.timezone) && (
                        <p className="text-sm text-slate-500">
                          {[loc.phone, loc.timezone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(loc)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 touch-manipulation"
                        aria-label="Edit location"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => window.confirm("Remove this location?") && deleteLocation(loc.id)}
                        disabled={deletingId === loc.id}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 touch-manipulation"
                        aria-label="Delete location"
                      >
                        {deletingId === loc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))
              )}

              {canAddMore && !loading && (
                <div className="p-4 sm:px-6 sm:py-4">
                  <button
                    type="button"
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Add location
                  </button>
                </div>
              )}
            </>
          )}

          {!canAccess && (
            <div className="border-t border-slate-100 p-4 sm:px-6 sm:py-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center sm:p-6">
                <MapPin className="mx-auto h-10 w-10 text-amber-600" />
                <p className="mt-2 text-sm font-medium text-slate-900">Add more branches with Pro or Elite</p>
                <p className="mt-1 text-sm text-slate-600">
                  Pro: up to 3 clinics · Elite: unlimited. Each branch gets its own chat embed and AI agent.
                </p>
                <Link
                  href="/app/plan"
                  className="mt-3 inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  View plans
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {canAccess && atLimit && (
        <p className="text-center text-sm text-slate-500">
          You&apos;ve reached your plan limit ({formatPlanLimitProp(limit)} locations).{" "}
          <Link href="/app/plan" className="font-medium text-primary hover:underline">
            Upgrade to Elite for unlimited locations
          </Link>
        </p>
      )}

      {/* Holidays (closed dates) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">Holidays & closed dates</h2>
        <p className="mt-0.5 text-sm text-slate-600">Dates when the clinic is closed. The AI will tell patients and avoid booking on these days.</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Date</label>
              <input
                type="date"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">End date (optional)</label>
              <input
                type="date"
                value={holidayForm.end_date}
                onChange={(e) => setHolidayForm((f) => ({ ...f, end_date: e.target.value }))}
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="xs:col-span-2">
              <label className="block text-xs font-medium text-slate-600">Label (e.g. Christmas)</label>
              <input
                type="text"
                value={holidayForm.label}
                onChange={(e) => setHolidayForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Holiday name"
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={addHoliday}
            disabled={addingHoliday || !holidayForm.date}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {addingHoliday ? <Loader2 className="inline h-4 w-4 animate-spin" /> : <CalendarX2 className="inline h-4 w-4" />}
            <span className="ml-1.5">Add</span>
          </button>
        </div>
        {holidays.length > 0 && (
          <ul className="mt-4 space-y-2">
            {holidays.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
                <span>
                  {h.holiday_date}
                  {h.end_date && h.end_date !== h.holiday_date ? ` – ${h.end_date}` : ""}
                  {h.label ? ` · ${h.label}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => window.confirm("Remove this date?") && deleteHoliday(h.id)}
                  disabled={deletingHolidayId === h.id}
                  className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="Remove"
                >
                  {deletingHolidayId === h.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add/Edit modal */}
      {(modalOpen === "add" || modalOpen === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl my-auto">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
              <h3 className="text-lg font-semibold text-slate-900">
                {modalOpen === "add" ? "Add location" : "Edit location"}
              </h3>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6 space-y-4">
              {locationFormError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{locationFormError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Downtown Branch"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Address line 1</label>
                <input
                  type="text"
                  value={form.address_line1}
                  onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Address line 2</label>
                <input
                  type="text"
                  value={form.address_line2}
                  onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">State / Province</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Postal code</label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Country</label>
                  <select
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select</option>
                    {COUNTRIESProp.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Timezone</label>
                <select
                  value={form.timezone || TIMEZONESProp[0]}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIMEZONESProp.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">WhatsApp number *</label>
                <p className="mt-0.5 text-xs text-slate-500">Required for this location. Include country code (e.g. +1 234 567 8900).</p>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="loc-accepts-insurance"
                  checked={form.accepts_insurance}
                  onChange={(e) => setForm((f) => ({ ...f, accepts_insurance: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="loc-accepts-insurance" className="text-sm font-medium text-slate-700">Accepts insurance (shown to patients in chat)</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Insurance notes (optional)</label>
                <textarea
                  value={form.insurance_notes}
                  onChange={(e) => setForm((f) => ({ ...f, insurance_notes: e.target.value }))}
                  rows={2}
                  placeholder="e.g. We accept most major plans."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Opening hours (for chat & patients)</p>
                <p className="mt-0.5 text-xs text-slate-500">Set times or leave closed.</p>
                <div className="mt-2 space-y-2">
                  {DAYS.map((d) => (
                    <div key={d} className="flex flex-wrap items-center gap-2">
                      <span className="w-10 text-sm text-slate-600">{DAY_LABELS[d]}</span>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!form.working_hours[d]}
                          onChange={(e) => setForm((f) => ({
                            ...f,
                            working_hours: { ...f.working_hours, [d]: e.target.checked ? null : { open: "09:00", close: "17:00" },
                            },
                          }))}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-primary"
                        />
                        Closed
                      </label>
                      {form.working_hours[d] && (
                        <>
                          <input
                            type="time"
                            value={form.working_hours[d]!.open}
                            onChange={(e) => setForm((f) => ({
                              ...f,
                              working_hours: { ...f.working_hours, [d]: { ...f.working_hours[d]!, open: e.target.value } },
                            }))}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                          <span className="text-slate-400">–</span>
                          <input
                            type="time"
                            value={form.working_hours[d]!.close}
                            onChange={(e) => setForm((f) => ({
                              ...f,
                              working_hours: { ...f.working_hours, [d]: { ...f.working_hours[d]!, close: e.target.value } },
                            }))}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => { clearLocationFormError(); setModalOpen(null); resetForm(); }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLocation}
                disabled={saving || !form.name.trim() || !form.phone.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {modalOpen === "add" ? "Add location" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit primary location modal */}
      {primaryEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl my-auto">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
              <h3 className="text-lg font-semibold text-slate-900">Edit primary location</h3>
              <p className="mt-0.5 text-sm text-slate-600">Main clinic name, address, timezone, and WhatsApp number.</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name *</label>
                <input
                  type="text"
                  value={primaryForm.name}
                  onChange={(e) => setPrimaryForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Address line 1</label>
                <input
                  type="text"
                  value={primaryForm.address_line1}
                  onChange={(e) => setPrimaryForm((f) => ({ ...f, address_line1: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Address line 2</label>
                <input
                  type="text"
                  value={primaryForm.address_line2}
                  onChange={(e) => setPrimaryForm((f) => ({ ...f, address_line2: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">City</label>
                  <input
                    type="text"
                    value={primaryForm.city}
                    onChange={(e) => setPrimaryForm((f) => ({ ...f, city: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">State / Province</label>
                  <input
                    type="text"
                    value={primaryForm.state}
                    onChange={(e) => setPrimaryForm((f) => ({ ...f, state: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Postal code</label>
                  <input
                    type="text"
                    value={primaryForm.postal_code}
                    onChange={(e) => setPrimaryForm((f) => ({ ...f, postal_code: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Country</label>
                  <select
                    value={primaryForm.country}
                    onChange={(e) => setPrimaryForm((f) => ({ ...f, country: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select</option>
                    {COUNTRIESProp.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Timezone</label>
                <select
                  value={primaryForm.timezone || TIMEZONESProp[0]}
                  onChange={(e) => setPrimaryForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIMEZONESProp.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">WhatsApp number *</label>
                <p className="mt-0.5 text-xs text-slate-500">Used for reminders and booking notifications (Elite). Include country code.</p>
                <input
                  type="tel"
                  value={(primaryForm as { whatsapp_phone?: string }).whatsapp_phone ?? ""}
                  onChange={(e) => setPrimaryForm((f) => ({ ...f, whatsapp_phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Default appointment charge (optional)</label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Average charge per visit. Used in Analytics for estimated revenue.
                </p>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={primaryForm.default_appointment_charge ?? ""}
                  onChange={(e) => setPrimaryForm((f) => ({ ...f, default_appointment_charge: e.target.value }))}
                  placeholder="e.g. 150"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primary-accepts-insurance"
                  checked={primaryForm.accepts_insurance}
                  onChange={(e) => setPrimaryForm((f) => ({ ...f, accepts_insurance: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="primary-accepts-insurance" className="text-sm font-medium text-slate-700">Accepts insurance (shown to patients in chat)</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Insurance notes (optional)</label>
                <textarea
                  value={primaryForm.insurance_notes}
                  onChange={(e) => setPrimaryForm((f) => ({ ...f, insurance_notes: e.target.value }))}
                  rows={2}
                  placeholder="e.g. We accept most major plans."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Opening hours (for chat & patients)</p>
                <p className="mt-0.5 text-xs text-slate-500">Set times or leave closed.</p>
                <div className="mt-2 space-y-2">
                  {DAYS.map((d) => (
                    <div key={d} className="flex flex-wrap items-center gap-2">
                      <span className="w-10 text-sm text-slate-600">{DAY_LABELS[d]}</span>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!primaryForm.working_hours[d]}
                          onChange={(e) => setPrimaryForm((f) => ({
                            ...f,
                            working_hours: { ...f.working_hours, [d]: e.target.checked ? null : { open: "09:00", close: "17:00" },
                            },
                          }))}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-primary"
                        />
                        Closed
                      </label>
                      {primaryForm.working_hours[d] && (
                        <>
                          <input
                            type="time"
                            value={primaryForm.working_hours[d]!.open}
                            onChange={(e) => setPrimaryForm((f) => ({
                              ...f,
                              working_hours: { ...f.working_hours, [d]: { ...f.working_hours[d]!, open: e.target.value } },
                            }))}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                          <span className="text-slate-400">–</span>
                          <input
                            type="time"
                            value={primaryForm.working_hours[d]!.close}
                            onChange={(e) => setPrimaryForm((f) => ({
                              ...f,
                              working_hours: { ...f.working_hours, [d]: { ...f.working_hours[d]!, close: e.target.value } },
                            }))}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setPrimaryEditOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePrimary}
                disabled={primarySaving || !primaryForm.name.trim() || !(primaryForm as { whatsapp_phone?: string }).whatsapp_phone?.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {primarySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
