"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";

export function ContactContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Contact us
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 text-slate-600"
        >
          Have a question or want to see DentraFlow in your practice? We’re here to help.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8"
        >
          {success ? (
            <p className="rounded-lg bg-primary/10 p-4 text-sm font-medium text-primary">
              Thanks for your message. We&apos;ll get back to you soon.
            </p>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  className="mt-1.5 block w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary touch-manipulation sm:text-sm"
                  placeholder="Your name"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5 block w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary touch-manipulation sm:text-sm"
                  placeholder="you@clinic.com"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={5000}
                  className="mt-1.5 block w-full min-h-[120px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary touch-manipulation sm:text-sm"
                  placeholder="How can we help?"
                  disabled={loading}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="min-h-[44px] w-full touch-manipulation sm:w-auto" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}
              </Button>
            </form>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-12 flex flex-wrap gap-8 text-slate-600"
        >
          <a href="mailto:support@dentraflow.com" className="flex items-center gap-2 hover:text-primary">
            <Mail className="h-5 w-5" />
            support@dentraflow.com
          </a>
        </motion.div>
      </div>
    </div>
  );
}
