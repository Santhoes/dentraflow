"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { validatePassword } from "@/lib/password-validate";
import { Loader2 } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok && data?.error) {
        setError(data.error);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const passwordErr = validatePassword(password);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setError(data?.error || "Could not set password. The link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft text-center sm:p-8"
          >
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Password updated</h1>
            <p className="mt-4 text-slate-600">You can now sign in with your new password.</p>
            <Button className="mt-8" asChild>
              <Link href="/login?reset=1">Back to login</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

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
              If that email is registered, we sent a reset link to <strong>{email}</strong>. Click the link to set a new password.
            </p>
            <Button className="mt-8" asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (token) {
    return (
      <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8"
          >
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set new password</h1>
            <p className="mt-2 text-sm text-slate-600">Enter your new password below.</p>
            <form className="mt-8 space-y-5" onSubmit={handleSetPassword}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  className="mt-1.5 block w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary touch-manipulation sm:text-sm"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  className="mt-1.5 block w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary touch-manipulation sm:text-sm"
                  placeholder="Repeat password"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="min-h-[44px] w-full touch-manipulation" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set password"}
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
          <form className="mt-8 space-y-5" onSubmit={handleRequestLink}>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
