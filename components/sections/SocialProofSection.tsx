"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "We went from missing dozens of after-hours calls to filling those slots. DentraFlow pays for itself in a week.",
    author: "Dr. Sarah Chen",
    role: "Owner, Bright Smile Dental",
    rating: 5,
  },
  {
    quote:
      "Our front desk is less stressed, and no-shows dropped by half. The AI briefings in the morning are a game-changer.",
    author: "Michael Torres",
    role: "Practice Manager, Metro Dental Group",
    rating: 5,
  },
  {
    quote:
      "Multi-location was a mess before. Now we see everything in one dashboard and our calendars stay full.",
    author: "Jennifer Park",
    role: "Operations, Smile Care Clinics",
    rating: 5,
  },
];

export function SocialProofSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
        >
          Built for Modern Dental Clinics
        </motion.h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-3 sm:gap-6 md:gap-8">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8"
            >
              <Quote className="h-8 w-8 text-primary/20" />
              <div className="mt-4 flex gap-1">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-700 sm:text-base">{t.quote}</p>
              <p className="mt-5 font-semibold text-slate-900">{t.author}</p>
              <p className="text-xs text-slate-500 sm:text-sm">{t.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
