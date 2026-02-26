"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { WidgetStyleDemo } from "@/components/sections/WidgetStyleDemo";

export function DemoSection() {
  const exampleSentRef = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const example = searchParams.get("example");
    if (!example || exampleSentRef.current) return;
    exampleSentRef.current = true;
    window.history.replaceState({}, "", window.location.pathname + "#demo");
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
  }, [searchParams]);

  return (
    <section id="demo" aria-label="Live demo of DentraFlow AI receptionist chat" className="overflow-x-hidden px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
        >
          DentraFlow in Action
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-center text-slate-600 text-sm sm:text-base"
        >
          Same flow as the chat widget on your site: tap chips to book, pick a date and time, enter name and email, then confirm. Demo content only — no real appointments.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-8 max-w-md sm:mt-10"
        >
          <WidgetStyleDemo />
        </motion.div>
      </div>
    </section>
  );
}
