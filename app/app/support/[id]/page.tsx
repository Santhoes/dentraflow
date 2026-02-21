"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Pencil, Trash2, Send } from "lucide-react";

interface SupportCase {
  id: string;
  clinic_id: string;
  user_id: string;
  subject: string;
  body: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
}

export default function SupportCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { clinic, user } = useApp();
  const id = typeof params?.id === "string" ? params.id : "";
  const [caseData, setCaseData] = useState<SupportCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCase = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from("support_messages")
        .select("id, clinic_id, user_id, subject, body, created_at, admin_reply, admin_replied_at")
        .eq("id", id)
        .single();
      if (e) {
        setError(e.message || "Case not found");
        setCaseData(null);
      } else if (data) {
        setCaseData(data as SupportCase);
        setEditSubject((data as SupportCase).subject || "");
        setEditBody((data as SupportCase).body || "");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const canEditDelete = caseData && user && caseData.user_id === user.id && caseData.admin_reply == null;

  const handleSaveEdit = async () => {
    if (!id || !caseData) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Please sign in again.");
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/app/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: editSubject.trim() || undefined, message: editBody.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update.");
        setSaving(false);
        return;
      }
      setEditing(false);
      fetchCase();
    } catch {
      setError("Failed to update.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!id || !caseData) return;
    if (!confirm("Delete this case? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Please sign in again.");
        setDeleting(false);
        return;
      }
      const res = await fetch(`/api/app/support/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete.");
        setDeleting(false);
        return;
      }
      router.replace("/app/support");
      return;
    } catch {
      setError("Failed to delete.");
    }
    setDeleting(false);
  };

  if (!clinic) return null;
  if (!id) {
    return (
      <div className="responsive-stack">
        <p className="text-slate-600">Invalid case.</p>
        <Link href="/app/support" className="text-primary hover:underline">Back to Support</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading case…
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="responsive-stack">
        <p className="text-red-600">{error}</p>
        <Link href="/app/support" className="text-primary hover:underline">Back to Support</Link>
      </div>
    );
  }

  if (!caseData) return null;

  return (
    <div className="responsive-stack space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/app/support"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Support
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-slate-900">
              {caseData.subject || "Support request"}
            </h1>
            <span
              className={caseData.admin_reply ? "text-xs text-emerald-600" : "text-xs text-amber-600"}
            >
              {caseData.admin_reply ? "Replied" : "Open"}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Opened {new Date(caseData.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {/* User message */}
          <div className="px-4 py-4 sm:px-6">
            <p className="text-xs font-medium text-slate-500">Your message</p>
            {editing ? (
              <div className="mt-2 space-y-3">
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving || !editBody.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setEditSubject(caseData.subject || ""); setEditBody(caseData.body || ""); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{caseData.body}</p>
                {canEditDelete && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Admin reply */}
          {caseData.admin_reply && (
            <div className="px-4 py-4 sm:px-6 bg-emerald-50/50">
              <p className="text-xs font-medium text-slate-500">
                Reply from DentraFlow
                {caseData.admin_replied_at
                  ? ` · ${new Date(caseData.admin_replied_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                  : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{caseData.admin_reply}</p>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
