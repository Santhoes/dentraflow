"use client";

import { useState, useCallback, useEffect } from "react";
import { useApp } from "@/lib/app-context";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Send, Loader2 } from "lucide-react";

interface SupportMessage {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
}

export default function AppChatPage() {
  const { clinic } = useApp();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const fetchMessages = useCallback(async () => {
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from("support_messages")
      .select("id, subject, body, created_at, admin_reply, admin_replied_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!e && data) setMessages((data as SupportMessage[]));
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Please sign in again.");
        setSending(false);
        return;
      }
      const res = await fetch("/api/app/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: subject.trim() || undefined, message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to send.");
        setSending(false);
        return;
      }
      setSent(true);
      setSubject("");
      setMessage("");
      fetchMessages();
    } catch {
      setError("Failed to send.");
    }
    setSending(false);
  };

  if (!clinic) return null;

  return (
    <div className="responsive-stack space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Chat</h1>
        <p className="mt-1 text-slate-600">
          Message our team. We&apos;ll get back to you as soon as we can.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <MessageSquare className="h-5 w-5 text-primary" />
          New message
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
          {sent && <p className="text-sm text-emerald-600">Message sent. Our team will get back to you.</p>}
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send message
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Your messages</h2>
        <p className="mt-0.5 text-sm text-slate-600">Previous messages and replies from our team.</p>
        {loadingMessages ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No messages yet. Send one above.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {messages.map((m) => (
              <li key={m.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-900">{m.subject || "Support request"}</span>
                  <span className="text-slate-500">
                    {new Date(m.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
                {m.admin_reply && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="text-xs font-medium text-slate-500">
                      Reply from DentraFlow
                      {m.admin_replied_at
                        ? ` · ${new Date(m.admin_replied_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}`
                        : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.admin_reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
