"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const GREETING = "Hi 👋 How can I help you today?";
const DEMO_CLINIC = "Demo Dental";

type AnimatedStep =
  | { type: "ai"; text: string }
  | { type: "user"; text: string; isChip?: boolean };

const ANIMATED_SEQUENCE: { step: AnimatedStep; delay: number }[] = [
  { step: { type: "ai", text: GREETING }, delay: 0 },
  { step: { type: "user", text: "Book Appointment", isChip: true }, delay: 2200 },
  { step: { type: "ai", text: "What do you need? Pick a reason." }, delay: 800 },
  { step: { type: "user", text: "Cleaning", isChip: true }, delay: 1600 },
  { step: { type: "ai", text: "When would you like to come? Pick a day." }, delay: 800 },
  { step: { type: "user", text: "Tomorrow", isChip: true }, delay: 1600 },
  { step: { type: "ai", text: "Morning, afternoon, or evening?" }, delay: 800 },
  { step: { type: "user", text: "2:00 PM", isChip: true }, delay: 1600 },
  { step: { type: "ai", text: "Enter your full name." }, delay: 800 },
  { step: { type: "user", text: "Jane" }, delay: 1400 },
  { step: { type: "ai", text: "Thanks! Enter your email." }, delay: 800 },
  { step: { type: "user", text: "jane@example.com" }, delay: 1400 },
  { step: { type: "ai", text: "Confirm your booking: Tomorrow at 2:00 PM." }, delay: 800 },
  { step: { type: "user", text: "Confirm booking", isChip: true }, delay: 1200 },
  { step: { type: "ai", text: "You're booked! Confirmation sent by email." }, delay: 0 },
];

const LOOP_DELAY_MS = 15000;

export function ChatDemo() {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const runSequence = () => {
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
      setVisibleSteps(0);
      let t = 0;
      ANIMATED_SEQUENCE.forEach(({ step, delay }, i) => {
        t += delay;
        timeoutIdsRef.current.push(
          setTimeout(() => setVisibleSteps((c) => Math.max(c, i + 1)), t)
        );
      });
    };

    runSequence();
    const loopId = setInterval(() => {
      setLoopKey((k) => k + 1);
      runSequence();
    }, LOOP_DELAY_MS);

    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
      clearInterval(loopId);
    };
  }, [loopKey]);

  const displaySteps = ANIMATED_SEQUENCE.slice(0, visibleSteps);
  const showTyping = visibleSteps < ANIMATED_SEQUENCE.length;

  return (
    <motion.div
      key={loopKey}
      className="relative w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white/90 p-1 shadow-soft backdrop-blur-sm"
      style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.08)" }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center gap-2 rounded-t-xl border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="relative inline-flex shrink-0">
          <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded object-contain" />
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
        </span>
        <span className="text-xs font-medium text-slate-500">{DEMO_CLINIC} • Live</span>
      </div>
      <div className="flex min-h-[280px] flex-col gap-3 p-4">
        {displaySteps.map(({ step }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${step.type === "ai" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                step.type === "ai"
                  ? "rounded-bl-md bg-primary/10 text-slate-800"
                  : step.type === "user" && step.isChip
                    ? "rounded-br-md border-2 border-primary/40 bg-primary/10 text-primary font-medium"
                    : "rounded-br-md bg-primary text-white"
              }`}
            >
              {step.text}
            </div>
          </motion.div>
        ))}
        {showTyping && (
          <motion.div
            animate={{ opacity: [0.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="flex justify-start"
          >
            <div className="rounded-2xl rounded-bl-md bg-primary/10 px-4 py-2.5 text-sm text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
