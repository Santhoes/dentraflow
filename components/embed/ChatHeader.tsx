"use client";

import { motion } from "framer-motion";
import { X, Moon, Sun } from "lucide-react";

interface ChatHeaderProps {
  displayName: string;
  logoUrl?: string;
  dark: boolean;
  onToggleDark: () => void;
  onMinimize: () => void;
  headerColor: string;
}

export function ChatHeader({
  displayName,
  logoUrl,
  dark,
  onToggleDark,
  onMinimize,
  headerColor,
}: ChatHeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 flex shrink-0 items-center gap-3 px-3 py-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-4 sm:py-3"
      style={{ backgroundColor: headerColor }}
    >
      {logoUrl && (
        <span className="relative flex h-9 w-9 shrink-0 overflow-visible">
          <span className="relative flex h-9 w-9 overflow-hidden rounded-lg bg-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </span>
          {/* Live agent indicator */}
          <span
            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
            title="Live"
            aria-hidden
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{displayName}</p>
        <p className="text-xs opacity-90">AI Receptionist</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <motion.button
          type="button"
          onClick={onToggleDark}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 opacity-90 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white touch-manipulation"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </motion.button>
        <motion.button
          type="button"
          onClick={onMinimize}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 opacity-90 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white touch-manipulation"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Minimize chat"
        >
          <X className="h-5 w-5" />
        </motion.button>
      </div>
    </header>
  );
}
