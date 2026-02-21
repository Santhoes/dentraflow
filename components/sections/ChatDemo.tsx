"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const MESSAGES: { role: "patient" | "ai"; text: string; delay: number }[] = [
  { role: "patient", text: "Hi, I’d like to book a cleaning.", delay: 0 },
  { role: "ai", text: "Hi! I’d be happy to help. Which location do you prefer?", delay: 1200 },
  { role: "patient", text: "Downtown office please.", delay: 2800 },
  { role: "ai", text: "Got it. We have openings this Thu 2pm or Fri 10am. Which works?", delay: 4000 },
  { role: "patient", text: "Thursday 2pm works!", delay: 5600 },
  { role: "ai", text: "You’re all set for Thu at 2pm. We’ll send a reminder. Anything else?", delay: 7000 },
];

export function ChatDemo() {
  const [visibleCount, setVisibleCount] = useState(0);

  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const runSequence = () => {
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
      setVisibleCount(0);
      MESSAGES.forEach((_, i) => {
        timeoutIdsRef.current.push(
          setTimeout(() => setVisibleCount((c) => Math.min(c + 1, MESSAGES.length)), MESSAGES[i].delay)
        );
      });
    };
    runSequence();
    const loopId = setInterval(runSequence, 12000);
    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
      clearInterval(loopId);
    };
  }, []);

  const displayCount = visibleCount % (MESSAGES.length + 1);

  return (
    <motion.div
      className="relative w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white/90 p-1 shadow-soft backdrop-blur-sm"
      style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.08)" }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center gap-2 rounded-t-xl border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="relative inline-flex shrink-0">
          <img src="/logo.png" alt="" className="h-7 w-7 rounded object-contain" />
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
        </span>
        <span className="text-xs font-medium text-slate-500">DentraFlow • Live</span>
      </div>
      <div className="flex flex-col gap-3 p-4 min-h-[280px]">
        {MESSAGES.slice(0, displayCount).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "ai"
                  ? "bg-primary/10 text-slate-800 rounded-bl-md"
                  : "bg-primary text-white rounded-br-md"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        {displayCount < MESSAGES.length && (
          <motion.div
            animate={{ opacity: [0.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="flex justify-start"
          >
            <div className="rounded-2xl rounded-bl-md bg-primary/10 px-4 py-2.5 text-sm text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
