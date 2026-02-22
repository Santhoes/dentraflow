"use client";

import React from "react";
import { motion } from "framer-motion";

export interface SuggestionChipItem {
  key?: string;
  label: string;
  value?: string;
  variant?: "default" | "danger" | "secondary" | "primary";
}

interface SuggestionChipsProps {
  items: SuggestionChipItem[];
  visible: boolean;
  onSelect: (keyOrLabel: string, label: string, value?: string) => void;
  disabled?: boolean;
  accentColor: string;
  dark?: boolean;
}

function getChipClassName(
  item: SuggestionChipItem,
  dark: boolean,
  accentColor: string
): string {
  const base = "rounded-full px-4 py-2.5 min-h-[44px] text-sm font-medium shrink-0 touch-manipulation transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ";
  if (item.variant === "danger") {
    return base + "bg-red-600 text-white hover:bg-red-700";
  }
  if (item.variant === "secondary") {
    return (
      base +
      (dark
        ? "border border-slate-500 bg-transparent text-slate-300 hover:bg-slate-600/50"
        : "border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100")
    );
  }
  if (item.variant === "primary") {
    return base + "text-white hover:opacity-95";
  }
  return (
    base +
    (dark
      ? "bg-slate-600 text-slate-200 hover:bg-slate-500"
      : "bg-slate-100 text-slate-700 hover:bg-slate-200")
  );
}

export function SuggestionChips(props: SuggestionChipsProps) {
  const { items, visible, onSelect, disabled, accentColor, dark } = props;
  if (!visible || items.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide px-3 pb-2 pr-[max(1rem,env(safe-area-inset-right))] sm:px-4 sm:pb-3"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      {items.map((item, index) => {
        const isPrimary = item.variant === "primary";
        const style =
          isPrimary && accentColor
            ? { backgroundColor: accentColor }
            : item.variant !== "danger" &&
              item.variant !== "secondary" &&
              item.value
            ? { border: "1px solid " + (dark ? "rgba(255,255,255,0.2)" : accentColor + "40") }
            : undefined;
        const keyOrLabel = item.key ?? item.label;
        return (
          <motion.button
            key={item.key ?? item.value ?? item.label}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(keyOrLabel, item.label, item.value)}
            className={getChipClassName(item, !!dark, accentColor)}
            style={style}
            aria-label={item.value ? "Select: " + item.label : "Suggest: " + item.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.15 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {item.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
