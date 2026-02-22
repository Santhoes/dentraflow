"use client";

import { motion } from "framer-motion";

interface TypingIndicatorProps {
  accentColor: string;
  dark?: boolean;
}

export function TypingIndicator({ accentColor, dark }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 ${
        dark ? "bg-slate-700" : "bg-slate-100"
      }`}
    >
      <span className="flex gap-1.5" aria-live="polite" aria-label="AI is typing">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accentColor }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </span>
    </motion.div>
  );
}
