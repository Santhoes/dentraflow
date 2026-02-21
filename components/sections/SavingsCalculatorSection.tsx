"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT_MISSED = 24;
const DEFAULT_AVG_VALUE = 180;
const DEFAULT_PCT_LOST = 25; // % of missed inquiries that would have booked (without AI they're lost)
const DEFAULT_PCT_CAPTURE = 35; // % we capture with chat widget

export function SavingsCalculatorSection() {
  const [missed, setMissed] = useState(DEFAULT_MISSED);
  const [avgValue, setAvgValue] = useState(DEFAULT_AVG_VALUE);
  const [pctLost, setPctLost] = useState(DEFAULT_PCT_LOST);
  const [pctCapture, setPctCapture] = useState(DEFAULT_PCT_CAPTURE);

  const lostPerMonth = Math.round((missed * pctLost) / 100 * avgValue);
  const earnedPerMonth = Math.round((missed * pctCapture) / 100 * avgValue);
  const lostPerYear = lostPerMonth * 12;
  const earnedPerYear = earnedPerMonth * 12;
  const netGainPerYear = earnedPerYear; // money they get back by capturing with AI

  return (
    <section id="calculator" className="bg-slate-50/80 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Calculator className="h-3.5 w-3.5" />
            Estimate your numbers
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
            How much you lose without AI — and earn with our chat widget
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
            Adjust the sliders to match your clinic. See potential revenue lost when after-hours inquiries go unanswered, and what you can capture with DentraFlow.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:mt-12 sm:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Your assumptions</h3>
              <div>
                <label className="flex justify-between text-sm font-medium text-slate-700">
                  <span>Missed after-hours inquiries per month</span>
                  <span className="text-slate-500">{missed}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={missed}
                  onChange={(e) => setMissed(Number(e.target.value))}
                  className="mt-1.5 h-2 w-full accent-primary"
                />
              </div>
              <div>
                <label className="flex justify-between text-sm font-medium text-slate-700">
                  <span>Average value per booking ($)</span>
                  <span className="text-slate-500">${avgValue}</span>
                </label>
                <input
                  type="range"
                  min={80}
                  max={400}
                  step={10}
                  value={avgValue}
                  onChange={(e) => setAvgValue(Number(e.target.value))}
                  className="mt-1.5 h-2 w-full accent-primary"
                />
              </div>
              <div>
                <label className="flex justify-between text-sm font-medium text-slate-700">
                  <span>Without AI: % of missed that would have booked</span>
                  <span className="text-slate-500">{pctLost}%</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={45}
                  value={pctLost}
                  onChange={(e) => setPctLost(Number(e.target.value))}
                  className="mt-1.5 h-2 w-full accent-primary"
                />
                <p className="mt-0.5 text-xs text-slate-500">Revenue you’re losing today</p>
              </div>
              <div>
                <label className="flex justify-between text-sm font-medium text-slate-700">
                  <span>With DentraFlow: % you capture via chat widget</span>
                  <span className="text-slate-500">{pctCapture}%</span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={55}
                  value={pctCapture}
                  onChange={(e) => setPctCapture(Number(e.target.value))}
                  className="mt-1.5 h-2 w-full accent-primary"
                />
                <p className="mt-0.5 text-xs text-slate-500">New bookings from those inquiries</p>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-6 rounded-xl bg-slate-50/80 p-6 dark:bg-slate-800/40">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Results</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                  <TrendingDown className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-xs font-medium uppercase text-red-700 dark:text-red-400">Without AI (lost)</p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-300">
                      ${lostPerMonth.toLocaleString()}/mo
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ${lostPerYear.toLocaleString()}/year in missed revenue
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                  <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-400">With DentraFlow (earned)</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      ${earnedPerMonth.toLocaleString()}/mo
                    </p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      ${earnedPerYear.toLocaleString()}/year in new bookings captured
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-medium uppercase text-primary">Net impact</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    Capture up to ${netGainPerYear.toLocaleString()}/year with our AI chat widget
                  </p>
                </div>
              </div>
              <Button size="lg" className="mt-2 w-full sm:w-auto" asChild>
                <Link href="/signup">Start free trial</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
