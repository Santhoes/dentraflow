"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Send, Loader2, ChevronRight, Inbox } from "lucide-react";

interface SupportCase {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
}

export default function AppSupportPage() {
  const { clinic } = useApp();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  const fetchCases = useCallback(async () => {
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from("support_messages")
      .select("id, subject, body, created_at, admin_reply, admin_replied_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!e && data) setCases((data as SupportCase[]));
    setLoadingCases(false);
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const supabase = createClient();
      let {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        session = refreshed ?? null;
      }
      const token = session?.access_token;
      if (!token) {
        setError("Please sign in again.");
        setSending(false);
        return;
      }
      let res = await fetch("/api/app/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: subject.trim() || undefined, message: message.trim() }),
      });
      if (res.status === 401) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        const newToken = refreshed?.access_token;
        if (newToken) {
          res = await fetch("/api/app/support", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${newToken}` },
            body: JSON.stringify({ subject: subject.trim() || undefined, message: message.trim() }),
          });
        }
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create case.");
        setSending(false);
        return;
      }
      setSent(true);
      setSubject("");
      setMessage("");
      fetchCases();
    } catch {
      setError("Failed to create case.");
    }
    setSending(false);
  };

  if (!clinic) return null;

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Support</h1>
        <p className="mt-1 text-slate-600">
          Open a case or view your support history. Each case has its own thread and reply from our team.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <MessageSquare className="h-5 w-5 text-primary" />
          New case
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="support-subject" className="block text-sm font-medium text-slate-700">
              Subject (optional)
            </label>
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Billing question"
              className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="support-message" className="block text-sm font-medium text-slate-700">
              Message
            </label>
            <textarea
              id="support-message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your question or issue..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {sent && (
            <p className="text-sm text-emerald-600">Case created. You can view it below and we&apos;ll reply there.</p>
          )}
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Create case
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Inbox className="h-5 w-5 text-slate-600" />
          Your cases
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">Click a case to see the full conversation and reply.</p>
        {loadingCases ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : cases.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No cases yet. Create one above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/support/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-4 text-left transition-colors hover:bg-slate-50/80"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{c.subject || "Support request"}</span>
                    <span className="ml-2 text-sm text-slate-500">
                      {new Date(c.created_at).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    <div className="mt-0.5">
                      <span
                        className={c.admin_reply ? "text-xs text-emerald-600" : "text-xs text-amber-600"}
                      >
                        {c.admin_reply ? "Replied" : "Open"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
