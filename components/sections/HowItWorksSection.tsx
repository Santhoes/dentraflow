"use client";

import { motion } from "framer-motion";
import { Plug, MessageSquare, Calendar } from "lucide-react";

const STEPS = [
  {
    step: 1,
    icon: Plug,
    title: "Install & Connect Your Clinic",
    description: "Connect your practice management system. DentraFlow syncs in minutes.",
  },
  {
    step: 2,
    icon: MessageSquare,
    title: "AI Handles Patient Conversations",
    description: "Calls and chats are answered 24/7. Booking and rescheduling happen in real time.",
  },
  {
    step: 3,
    icon: Calendar,
    title: "More Booked Appointments Automatically",
    description: "Your calendar fills up. Fewer gaps, fewer no-shows, happier staff.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-slate-50/80 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
        >
          How It Works
        </motion.h2>
        <div className="relative mt-10 grid grid-cols-1 gap-8 sm:mt-12 md:mt-16 md:grid-cols-3 md:gap-6 lg:mt-20 lg:gap-8">
          <div className="absolute top-7 left-[16.666%] right-[16.666%] hidden h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" aria-hidden />
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-soft"
              >
                <span className="text-lg font-bold">{s.step}</span>
              </motion.div>
              <div className="mt-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 md:text-lg">{s.title}</h3>
              <p className="mt-2 max-w-xs text-sm text-slate-600">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
