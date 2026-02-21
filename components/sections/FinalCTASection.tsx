"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function FinalCTASection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
        >
          Ready to Fill More Chairs?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 text-base text-slate-600 sm:text-lg"
        >
          Join practices that use DentraFlow to book more appointments and stress less.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button id="trial" size="lg" className="mt-8 min-h-[48px] px-8 text-base touch-manipulation sm:mt-10 sm:h-14 sm:px-10" asChild>
            <Link href="/signup">Start Your Free Trial</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
