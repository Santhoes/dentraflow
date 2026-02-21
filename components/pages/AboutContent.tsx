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
          className="mt-6 text-lg text-slate-600"
        >
          DentraFlow is an AI receptionist built for dental clinics. We help practices fill more chairs by answering calls and chats 24/7, booking appointments, sending reminders, and keeping front-desk staff focused on patients in the office.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 space-y-8 text-slate-600"
        >
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Our mission</h2>
            <p className="mt-2">
              Our mission is simple: fewer empty chairs and more booked appointments. We believe every after-hours inquiry is a patient who wants to book. When your office is closed, voicemails and missed chats turn into lost revenue. DentraFlow captures those inquiries around the clock so your calendar stays full and your team can focus on the patients in the chair.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">What we offer</h2>
            <p className="mt-2">
              We provide a 24/7 AI receptionist that handles patient conversations via an embeddable chat widget on your website. The AI can answer questions about services and hours, collect patient details, and book or reschedule appointments in real time. We send automated reminders by email and, on higher plans, via WhatsApp to reduce no-shows. Multi-location practices get a single dashboard to manage all sites, and morning briefings keep your staff informed about who&apos;s coming in and what they need.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Who it&apos;s for</h2>
            <p className="mt-2">
              DentraFlow is designed for solo practices, multi-location groups, and everyone in between. Whether you need 24/7 booking, smart reminders, or a single dashboard for all your locations, we&apos;re here to help. If you&apos;re tired of missed after-hours calls and overworked front-desk staff, DentraFlow can scale your reception without adding headcount.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Why DentraFlow</h2>
            <p className="mt-2">
              We integrate with your existing workflow so you can go live in minutes, with no disruption. You keep using your practice management and calendar; we handle the conversations and sync bookings. No long implementation cycles or IT projects—just sign up, add the chat widget to your site, and start capturing appointments you used to miss.
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
