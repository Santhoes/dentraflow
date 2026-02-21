"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { MessageSquare, Loader2, Send } from "lucide-react";

interface SupportMessageRow {
  id: string;
  clinic_id: string;
  clinic_name: string;
  user_id: string;
  subject: string;
  body: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
}

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminFetch("/support-messages")
      .then((res: { messages: SupportMessageRow[] }) => {
        setMessages(res.messages ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitReply = async (messageId: string) => {
    if (!replyText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetch(`/support-messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ admin_reply: replyText.trim() }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                admin_reply: replyText.trim(),
                admin_replied_at: new Date().toISOString(),
              }
            : m
        )
      );
      setReplyingId(null);
      setReplyText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save reply");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Support</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Messages from clinic users. Reply to them via email or your support process.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : messages.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">No support messages yet.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-900 dark:text-slate-100">{m.subject || "Support request"}</span>
                <span className="text-slate-500 dark:text-slate-400">{m.clinic_name}</span>
                <span className="text-slate-400 dark:text-slate-500">
                  {new Date(m.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{m.body}</p>
              {m.admin_reply && replyingId !== m.id && (
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-600">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Your reply</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{m.admin_reply}</p>
                </div>
              )}
              {replyingId === m.id ? (
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-600">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Your reply</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="Type your reply…"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => submitReply(m.id)}
                      disabled={saving || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Save reply
                    </button>
                    <button
                      type="button"
                      onClick={() => { setReplyingId(null); setReplyText(""); }}
                      disabled={saving}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => { setReplyingId(m.id); setReplyText(m.admin_reply || ""); }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {m.admin_reply ? "Edit reply" : "Reply"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
