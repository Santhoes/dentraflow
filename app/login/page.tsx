"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    // Admin redirect
    if (email.trim().toLowerCase() === "admin@dentraflow.com") {
      window.location.href = "/admin";
      return;
    }
    window.location.href = "/app";
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8"
        >
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log in</h1>
          <p className="mt-2 text-sm text-slate-600">
            {registered === "1" ? "You’re already registered. Sign in below." : "Sign in to your DentraFlow account."}
          </p>
          {searchParams.get("reset") === "1" && (
            <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm text-primary">
              Check your email for the reset link. You can set a new password from there.
            </p>
          )}
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
                className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="you@clinic.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1.5 text-right">
                <Link href="/reset-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="min-h-[44px] w-full touch-manipulation" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            Don’t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Start free trial
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center px-4"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
