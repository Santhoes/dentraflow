"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const check = await checkRes.json();
      if (!check.exists) {
        setError("No account found with this email.");
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/login?reset=1`,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft text-center sm:p-8"
          >
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Check your email</h1>
            <p className="mt-4 text-slate-600">
              We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
            </p>
            <Button className="mt-8" asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8"
        >
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your email and we’ll send you a link to reset your password.
          </p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1.5 block w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary touch-manipulation sm:text-sm"
                placeholder="you@clinic.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="min-h-[44px] w-full touch-manipulation" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
