"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChatDemo } from "@/components/sections/ChatDemo";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-slate-50 to-white px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16 md:pt-28 md:pb-20 lg:px-8 lg:pt-36 lg:pb-28">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#1D4ED808_1px,transparent_1px),linear-gradient(to_bottom,#1D4ED808_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/2 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-sm font-semibold uppercase tracking-wider text-primary"
          >
            AI Receptionist for Dental Clinics
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl"
          >
            AI Dental Receptionist That Books Appointments{" "}
            <span className="bg-gradient-to-r from-primary to-primary-400 bg-clip-text text-transparent">
              24/7
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-xl text-lg text-slate-600"
          >
            Never miss another appointment. DentraFlow answers calls, books visits, sends reminders,
            and fills your calendar automatically.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-3 sm:mt-10 sm:gap-4"
          >
            <Button size="lg" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              type="button"
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              className="cursor-pointer"
            >
              See Live Demo
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative flex justify-center lg:justify-end"
        >
          <div className="animate-float">
            <ChatDemo />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
