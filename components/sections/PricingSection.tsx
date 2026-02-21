"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_FEATURES } from "@/lib/supabase/types";

export function PricingSection() {
  return (
    <section id="pricing" className="bg-slate-50/80 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
        >
          Simple, Transparent Pricing
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-4 max-w-xl text-center text-slate-600 text-sm sm:text-base"
        >
          Choose a plan. Upgrade or downgrade anytime.
        </motion.p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-12 sm:gap-6 md:grid-cols-3 md:gap-6 lg:mt-16 lg:gap-8">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 lg:p-8 ${
                plan.id === "pro"
                  ? "border-primary/40 shadow-glow ring-2 ring-primary/20"
                  : "border-slate-200/80 hover:shadow-glow"
              }`}
            >
              {plan.id === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
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
                <Link href={plan.id === "elite" ? "/signup?plan=elite" : `/signup?plan=${plan.id}`}>
                  {plan.id === "elite" ? "Upgrade to Elite" : "Subscribe / Pay"}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/pricing" className="font-medium text-primary hover:underline">
            View full pricing page
          </Link>
        </p>
      </div>
    </section>
  );
}
