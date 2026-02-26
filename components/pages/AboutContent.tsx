"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function AboutContent() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          About DentraFlow
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 text-xl font-medium text-slate-800"
        >
          🦷 The AI Front Desk Built for Modern Dental Clinics
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mt-6 text-lg text-slate-600"
        >
          DentraFlow is an intelligent AI receptionist designed specifically for dental practices. We help clinics reduce no-shows, automate bookings, and deliver 24/7 patient support — without increasing front-desk workload.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="mt-4 text-lg text-slate-600"
        >
          We believe dental teams should focus on patient care, not missed calls.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 space-y-8 text-slate-600"
        >
          <section>
            <h2 className="text-xl font-semibold text-slate-900">🌍 Why We Built DentraFlow</h2>
            <p className="mt-2">
              Dental clinics lose thousands of dollars every month due to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Missed calls after hours</li>
              <li>Appointment no-shows</li>
              <li>Manual booking errors</li>
              <li>Front desk overload</li>
              <li>Slow response times</li>
            </ul>
            <p className="mt-4">
              Patients today expect instant answers and easy booking.
            </p>
            <p className="mt-2">
              DentraFlow bridges that gap with a smart AI assistant that:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Responds instantly</li>
              <li>Books appointments automatically</li>
              <li>Collects deposits when required</li>
              <li>Sends reminders</li>
              <li>Handles common treatment questions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">🤖 What Makes DentraFlow Different</h2>
            <p className="mt-2">
              Unlike generic chatbots, DentraFlow is built specifically for dentistry.
            </p>
            <p className="mt-2">Our AI understands:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Treatment types</li>
              <li>Appointment durations</li>
              <li>Deposit requirements</li>
              <li>Cancellation policies</li>
              <li>Multi-chair scheduling</li>
            </ul>
            <p className="mt-4">
              We integrate directly with your booking system and payment gateway to ensure seamless appointment confirmation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">💎 Designed for Growth</h2>
            <p className="mt-2">
              DentraFlow is ideal for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Private dental practices</li>
              <li>Multi-location clinics</li>
              <li>Cosmetic dental centers</li>
              <li>Orthodontic practices</li>
              <li>Implant-focused clinics</li>
            </ul>
            <p className="mt-4">
              Whether you serve 20 patients a day or 200, DentraFlow scales with your practice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">🔐 Secure & Compliant</h2>
            <p className="mt-2">We prioritize:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Secure payment processing</li>
              <li>Data protection standards</li>
              <li>Role-based access</li>
              <li>Reliable infrastructure</li>
            </ul>
            <p className="mt-4">
              Payments go directly to the clinic. DentraFlow does not hold patient funds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">🚀 Our Mission</h2>
            <p className="mt-2">
              To modernize dental front desks worldwide with intelligent automation that improves revenue, reduces stress, and enhances patient experience.
            </p>
            <p className="mt-4">
              We&apos;re building the future of dental patient communication — powered by AI.
            </p>
          </section>

          <div className="pt-4">
            <Button asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
