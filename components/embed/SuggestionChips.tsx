"use client";

import React from "react";

export interface SuggestionChipItem {
  key?: string;
  label: string;
  value?: string;
  variant?: "default" | "danger";
}

interface SuggestionChipsProps {
  items: SuggestionChipItem[];
  visible: boolean;
  onSelect: (keyOrLabel: string, label: string, value?: string) => void;
  disabled?: boolean;
  accentColor: string;
  dark?: boolean;
}

export function SuggestionChips(props: SuggestionChipsProps) {
  const { items, visible, onSelect, disabled, accentColor, dark } = props;
  if (!visible || items.length === 0) return null;
  return React.createElement(
    "div",
    {
      className: "flex flex-nowrap gap-2 overflow-x-auto px-3 pb-2 pr-[max(1rem,env(safe-area-inset-right))] scrollbar-thin sm:px-4 sm:pb-3",
      style: { WebkitOverflowScrolling: "touch" } as React.CSSProperties,
    },
    items.map((item) => {
      const isDanger = item.variant === "danger";
      const className = (isDanger
        ? "rounded-full px-4 py-2.5 min-h-[44px] text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 touch-manipulation"
        : dark
          ? "rounded-full px-4 py-2.5 min-h-[44px] text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50 touch-manipulation"
          : "rounded-full px-4 py-2.5 min-h-[44px] text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 touch-manipulation") + " shrink-0";
      const keyOrLabel = item.key ?? item.label;
      return React.createElement(
        "button",
        {
          key: item.key ?? item.value ?? item.label,
          type: "button",
          disabled,
          onClick: () => onSelect(keyOrLabel, item.label, item.value),
          className,
          style: !isDanger && item.value
            ? { border: "1px solid " + (dark ? "rgba(255,255,255,0.2)" : accentColor + "40") }
            : undefined,
          "aria-label": item.value ? "Select: " + item.label : "Suggest: " + item.label,
        },
        item.label
      );
    })
  );
}
