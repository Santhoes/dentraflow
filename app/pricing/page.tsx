"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_FEATURES } from "@/lib/supabase/types";

export default function PricingPage() {
  return (
    <div className="min-h-[50vh] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
        >
          Simple, Transparent Pricing
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mx-auto mt-4 max-w-xl text-center text-slate-600"
        >
          Choose a plan and pay here. New to DentraFlow? You’ll set up your clinic after payment.
        </motion.p>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 sm:gap-6 md:grid-cols-3 md:gap-6 lg:mt-16 lg:gap-8">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`relative rounded-2xl border bg-white p-6 shadow-soft sm:p-8 ${
                plan.id === "pro" ? "border-primary/40 ring-2 ring-primary/20" : "border-slate-200/80"
              }`}
            >
              {plan.id === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </div>
              )}
              <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">
                  ${(plan.priceCents / 100).toFixed(0)}
                </span>
                <span className="text-slate-500">/month</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {(PLAN_FEATURES[plan.id] || []).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={plan.id === "pro" ? "default" : "secondary"}
                size="lg"
                asChild
              >
                <Link href={plan.id === "elite" ? `/signup?plan=elite` : `/signup?plan=${plan.id}`}>
                  {plan.id === "elite" ? "Upgrade to Elite" : "Subscribe / Pay"}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
