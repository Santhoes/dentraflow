"use client";

import { motion } from "framer-motion";
import { PhoneOff, UserX, Users } from "lucide-react";

const PROBLEMS = [
  {
    icon: PhoneOff,
    title: "Missed After-Hours Calls",
    description: "Patients call when you’re closed. Voicemails pile up and many never call back.",
  },
  {
    icon: UserX,
    title: "No-shows & Cancellations",
    description: "Empty chairs and last-minute cancellations hurt revenue and schedule flow.",
  },
  {
    icon: Users,
    title: "Overloaded Front Desk Staff",
    description: "Reception handles calls, check-ins, and scheduling—leading to burnout and errors.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function ProblemSection() {
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
          Empty Chairs Cost Dental Clinics Thousands Every Month
        </motion.h2>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-8 grid grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-3 sm:gap-6 md:gap-8"
        >
          {PROBLEMS.map((p) => (
            <motion.div
              key={p.title}
              variants={item}
              className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow sm:p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900 sm:text-lg">{p.title}</h3>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">{p.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
