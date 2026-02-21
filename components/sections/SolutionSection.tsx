"use client";

import { motion } from "framer-motion";
import {
  MessageCircle,
  CalendarCheck,
  Bell,
  LayoutDashboard,
  FileText,
  CreditCard,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "24/7 AI Chat Receptionist",
    description: "Conversations and bookings around the clock, even when the office is closed.",
  },
  {
    icon: CalendarCheck,
    title: "Automatic Appointment Booking",
    description: "Patients book in real time. Your calendar stays full without extra effort.",
  },
  {
    icon: Bell,
    title: "Smart Reminders (Email/SMS)",
    description: "Reduce no-shows with automated reminders that patients actually read.",
  },
  {
    icon: LayoutDashboard,
    title: "Multi-Clinic Dashboard",
    description: "Manage all locations from one place. Clear view of schedules and performance.",
  },
  {
    icon: FileText,
    title: "AI Staff Briefings",
    description: "Morning briefs so your team knows who’s coming and what they need.",
  },
  {
    icon: CreditCard,
    title: "Subscription & Billing Automation",
    description: "Recurring plans and billing handled automatically so you focus on care.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function SolutionSection() {
  return (
    <section id="features" className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
        >
          Meet DentraFlow — Your AI Front Desk
        </motion.h2>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-8 grid grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:mt-16 lg:grid-cols-3 lg:gap-8"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow sm:p-6"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 sm:text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
