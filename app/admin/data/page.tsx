"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Loader2, Database, AlertTriangle } from "lucide-react";

const CONFIRM_TEXT = "CLEAR";

type TableOption = { id: string; label: string };

export default function AdminDataPage() {
  const [tables, setTables] = useState<TableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    adminFetch("/clear-table")
      .then((data: { tables?: TableOption[] }) => setTables(data.tables ?? []))
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, []);

  const handleClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || confirmValue !== CONFIRM_TEXT) {
      setMessage({ type: "err", text: `Type ${CONFIRM_TEXT} to confirm.` });
      return;
    }
    setClearing(true);
    setMessage(null);
    try {
      await adminFetch("/clear-table", {
        method: "POST",
        body: JSON.stringify({ table: selectedTable }),
      });
      setMessage({ type: "ok", text: `Table "${selectedTable}" cleared. Related tables may have been cleared (CASCADE).` });
      setConfirmValue("");
      setSelectedTable("");
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Failed to clear table." });
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Clear table data</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Empty user and operational data (appointments, notifications, rate limits, support, payments). Only data tables are listed; clinics and config are not clearable here. CASCADE may clear related tables.
        </p>
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

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            This action cannot be undone. All rows in the selected table (and possibly related tables) will be permanently deleted.
          </p>
        </div>
      </div>

      <form onSubmit={handleClear} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <label htmlFor="clear-table-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Table
          </label>
          <select
            id="clear-table-select"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="">Select a table</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="clear-confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Type <strong>{CONFIRM_TEXT}</strong> to confirm
          </label>
          <input
            id="clear-confirm"
            type="text"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value.toUpperCase())}
            placeholder={CONFIRM_TEXT}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={clearing || !selectedTable || confirmValue !== CONFIRM_TEXT}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Clear table data
        </button>
      </form>
    </div>
  );
}
