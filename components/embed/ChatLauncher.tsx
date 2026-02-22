"use client";

import { motion } from "framer-motion";

function hexToRgb(hex: string): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return "29, 78, 216";
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

interface ChatLauncherProps {
  onClick: () => void;
  accentColor: string;
  isElite?: boolean;
}

export function ChatLauncher({ onClick, accentColor, isElite }: ChatLauncherProps) {
  const rgb = hexToRgb(accentColor);
  const gradient = isElite
    ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 50%, ${accentColor}99 100%)`
    : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)";
  const shadowColor = isElite ? `rgba(${rgb}, 0.45)` : "rgba(29, 78, 216, 0.45)";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-full border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 touch-manipulation sm:h-[52px] sm:w-[52px] md:h-14 md:w-14"
      style={{
        background: gradient,
        boxShadow: `0 6px 24px ${shadowColor}, 0 2px 8px rgba(0,0,0,0.08)`,
        ["--tw-ring-color" as string]: accentColor,
      }}
      whileHover={{
        scale: 1.08,
        boxShadow: `0 8px 28px ${shadowColor}, 0 4px 12px rgba(0,0,0,0.1)`,
      }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      aria-label="Open chat"
    >
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        animate={{ opacity: [0, 0.25, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 8 }}
      />
      <svg
        className="relative h-6 w-6 text-white sm:h-5 sm:w-5 md:h-6 md:w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </motion.button>
  );
}
