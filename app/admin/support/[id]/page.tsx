"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";
import { ArrowLeft, Loader2, Send } from "lucide-react";

interface SupportCaseRow {
  id: string;
  clinic_id: string;
  clinic_name: string;
  user_id: string;
  subject: string;
  body: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
  status: string;
}

export default function AdminSupportCasePage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [caseData, setCaseData] = useState<SupportCaseRow | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusToggling, setStatusToggling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch(`/support-messages/${id}`) as SupportCaseRow;
      setCaseData(data);
      setReplyText(data.admin_reply ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const submitReply = async () => {
    if (!id || !replyText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetch(`/support-messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ admin_reply: replyText.trim() }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save reply");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: "open" | "closed") => {
    if (!id) return;
    setStatusToggling(true);
    setError(null);
    try {
      await adminFetch(`/support-messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusToggling(false);
    }
  };

  if (!id) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">Invalid case ID.</p>
        <Link href="/admin/support" className="text-primary hover:underline">← Back to Support</Link>
      </div>
    );
  }

  if (loading && !caseData) {
    return (
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading case…
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
        <Link href="/admin/support" className="text-primary hover:underline">← Back to Support</Link>
      </div>
    );
  }

  if (!caseData) return null;

  const isClosed = (caseData.status || "open") === "closed";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Support
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {caseData.subject || "Support request"}
          </h1>
          <span className="text-slate-500 dark:text-slate-400">{caseData.clinic_name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isClosed
                ? "bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
            }`}
          >
            {isClosed ? "Closed" : "Open"}
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            {new Date(caseData.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{caseData.body}</p>

        {caseData.admin_reply && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-600">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Admin reply</p>
            {caseData.admin_replied_at && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(caseData.admin_replied_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{caseData.admin_reply}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatus(isClosed ? "open" : "closed")}
            disabled={statusToggling}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {statusToggling && <Loader2 className="h-4 w-4 animate-spin" />}
            {isClosed ? "Reopen case" : "Close case"}
          </button>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-600">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Reply to user</label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Type your reply…"
          />
          <div className="mt-2">
            <button
              type="button"
              onClick={submitReply}
              disabled={saving || !replyText.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Save reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
