"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages, type ChatMessage } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { SuggestionChips } from "./SuggestionChips";
import type { SuggestionItem } from "./ChatWidget";

const DEFAULT_ACCENT = "#1D4ED8";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  logoUrl?: string;
  dark: boolean;
  onToggleDark: () => void;
  accentColor: string;
  messages: ChatMessage[];
  isTyping: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: (text: string) => void;
  voiceSupported: boolean;
  isListening: boolean;
  onVoiceClick: () => void;
  suggestionItems: SuggestionItem[];
  showSuggestions: boolean;
  onChipSelect: (keyOrLabel: string, label?: string, value?: string) => void;
  inactivityMessage: string | null;
}

export function ChatPanel({
  isOpen,
  onClose,
  displayName,
  logoUrl,
  dark,
  onToggleDark,
  accentColor,
  messages,
  isTyping,
  input,
  onInputChange,
  onSend,
  voiceSupported,
  isListening,
  onVoiceClick,
  suggestionItems,
  showSuggestions,
  onChipSelect,
  inactivityMessage,
}: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const accent = accentColor && /^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : DEFAULT_ACCENT;
  const headerBg = accent;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusable);
      const idx = list.indexOf(document.activeElement as HTMLElement);
      if (idx === -1) return;
      const next = e.shiftKey ? list[idx - 1] ?? list[list.length - 1] : list[idx + 1] ?? list[0];
      if (next) {
        e.preventDefault();
        next.focus();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      const t = setTimeout(() => {
        const first = panelRef.current?.querySelector<HTMLElement>("button, input");
        first?.focus();
      }, 50);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        clearTimeout(t);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`fixed inset-0 z-[99998] flex h-full max-h-[85dvh] flex-col overflow-hidden rounded-none shadow-2xl
        pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]
        sm:inset-auto sm:left-1/2 sm:right-auto sm:top-auto sm:h-[min(420px,75dvh)] sm:w-[min(340px,94vw)] sm:max-w-[360px] sm:-translate-x-1/2 sm:rounded-2xl sm:bottom-4 sm:pb-0 sm:pr-0 sm:pl-0
        md:bottom-5 md:h-[min(460px,75dvh)] md:w-[min(360px,100%)]
        lg:left-auto lg:right-5 lg:translate-x-0
        ${dark ? "bg-slate-900" : "bg-white"}
        embed-panel-scrollbar`}
      style={{
        background: dark
          ? "#0F172A"
          : "rgba(255,255,255,0.95)",
        backdropFilter: "saturate(180%) blur(12px)",
      }}
      role="dialog"
      aria-label="Chat"
    >
      <ChatHeader
        displayName={displayName}
        logoUrl={logoUrl}
        dark={dark}
        onToggleDark={onToggleDark}
        onMinimize={onClose}
        headerColor={headerBg}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatMessages
          messages={messages}
          isTyping={isTyping}
          accentColor={accent}
          dark={dark}
        />
        {inactivityMessage && (
          <div className={`px-4 pb-2 text-center text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {inactivityMessage}
          </div>
        )}
        <SuggestionChips
          items={suggestionItems}
          visible={showSuggestions}
          onSelect={onChipSelect}
          disabled={isTyping}
          accentColor={accent}
          dark={dark}
        />
        <ChatInput
          value={input}
          onChange={onInputChange}
          onSend={onSend}
          disabled={isTyping}
          voiceSupported={voiceSupported}
          isListening={isListening}
          onVoiceClick={onVoiceClick}
          accentColor={accent}
          dark={dark}
        />
      </div>
    </motion.div>
  );
}
