"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatLauncher } from "./ChatLauncher";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { SuggestionChips } from "./SuggestionChips";
import { useDentalAgent, type ClinicInfo } from "./useDentalAgent";
import type { ChatMessage } from "./ChatMessages";

const DEFAULT_ACCENT = "#1D4ED8";
const STORAGE_DARK = "dentraflow-embed-dark";
const STORAGE_OPEN = "dentraflow-embed-open";

export interface DentalChatConfig {
  clinicName: string;
  locationName?: string;
  agentName?: string;
  agentId?: string;
  clinicSlug: string;
  locationId?: string;
  sig: string;
  logoUrl?: string;
  primaryColor?: string;
  isElitePlan?: boolean;
  /** Pro or Elite plan (for Add to Google Calendar). */
  plan?: string | null;
  clinicInfo: ClinicInfo;
  /** Notify parent when chat open state changes (e.g. to avoid full-height wrapper when minimized). */
  onOpenChange?: (open: boolean) => void;
}

export function DentalChat(config: DentalChatConfig) {
  const {
    clinicName,
    locationName,
    clinicSlug,
    locationId,
    agentId,
    sig,
    logoUrl,
    primaryColor,
    isElitePlan,
    plan,
    clinicInfo,
    onOpenChange,
  } = config;

  const displayName = locationName ? `${clinicName} — ${locationName}` : clinicName;
  const accentColor = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : DEFAULT_ACCENT;
  const isElite = !!primaryColor && primaryColor !== DEFAULT_ACCENT;

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const agent = useDentalAgent({
    clinicSlug,
    sig,
    locationId,
    agentId,
    isElitePlan: !!isElitePlan,
    isProOrElite: plan === "pro" || plan === "elite",
    clinicInfo,
  });

  const {
    messages,
    suggestions,
    isInputDisabled,
    isLoadingSlots,
    onChipSelect,
    onSend,
  } = agent;

  // Sync messages type: useDentalAgent returns ChatMessage from hook; ChatMessages expects { id, role, text }
  const chatMessages: ChatMessage[] = messages.map((m) => ({ id: m.id, role: m.role, text: m.text }));

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const storedDark = localStorage.getItem(STORAGE_DARK);
    if (storedDark !== null) setDark(storedDark === "1");
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setDark(true);
    const storedOpen = localStorage.getItem(STORAGE_OPEN);
    if (storedOpen === "1") setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    localStorage.setItem(STORAGE_OPEN, isOpen ? "1" : "0");
  }, [mounted, isOpen]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const handleSend = useCallback(
    (text: string) => {
      agent.onSend(text);
      setInputValue("");
    },
    [agent]
  );

  const handleChipSelect = useCallback(
    (key: string, label: string, value?: string) => {
      agent.onChipSelect(key, label, value);
    },
    [agent]
  );

  const minimize = useCallback(() => {
    try {
      if (typeof window !== "undefined" && window.self !== window.parent) {
        window.parent.postMessage({ type: "dentraflow-minimize" }, "*");
      }
    } catch {
      /* noop */
    }
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const suggestionItems = suggestions.map((s) => ({
    key: s.key,
    label: s.label,
    value: s.value,
    variant: s.variant as "default" | "danger" | undefined,
  }));

  const showSuggestions = suggestionItems.length > 0 || isLoadingSlots;

  if (!mounted) {
    return (
      <div
        className="fixed z-[99999] flex min-h-[48px] min-w-[48px] items-center justify-center md:h-[60px] md:w-[60px]"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))", right: "max(1.5rem, env(safe-area-inset-right))" }}
        aria-hidden
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed z-[99999]"
            style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))", right: "max(1.5rem, env(safe-area-inset-right))" }}
          >
            <ChatLauncher
              onClick={() => {
                setIsOpen(true);
                onOpenChange?.(true);
              }}
              accentColor={accentColor}
              isElite={isElite}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed inset-0 z-[99998] flex h-full flex-col overflow-hidden shadow-2xl
              pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]
              md:inset-auto md:bottom-6 md:left-1/2 md:right-auto md:h-[min(600px,90vh)] md:w-[90%] md:max-w-[420px] md:-translate-x-1/2 md:rounded-2xl md:pb-0 md:pr-0 md:pl-0
              lg:left-auto lg:right-6 lg:translate-x-0 lg:w-[min(420px,100%)]
              ${dark ? "bg-slate-900" : "bg-white"}`}
            style={{
              background: dark ? "#0F172A" : "rgba(255,255,255,0.95)",
              backdropFilter: "saturate(180%) blur(12px)",
            }}
            role="dialog"
            aria-label="Chat"
          >
            <ChatHeader
              displayName={displayName}
              logoUrl={logoUrl}
              dark={dark}
              onToggleDark={() => {
                setDark((d) => {
                  const next = !d;
                  if (typeof window !== "undefined") localStorage.setItem(STORAGE_DARK, next ? "1" : "0");
                  return next;
                });
              }}
              onMinimize={minimize}
              headerColor={accentColor}
            />
            <div className="flex min-h-0 flex-1 flex-col">
              <ChatMessages
                messages={chatMessages}
                isTyping={false}
                accentColor={accentColor}
                dark={dark}
              />
              {isLoadingSlots && (
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-10 w-24 animate-pulse rounded-full ${
                        dark ? "bg-slate-600" : "bg-slate-200"
                      }`}
                      aria-hidden
                    />
                  ))}
                </div>
              )}
              <SuggestionChips
                items={suggestionItems}
                visible={showSuggestions && !isLoadingSlots}
                onSelect={handleChipSelect}
                disabled={false}
                accentColor={accentColor}
                dark={dark}
              />
              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                disabled={isInputDisabled}
                placeholder={isInputDisabled ? "Choose an option above" : "Type here..."}
                voiceSupported={false}
                isListening={false}
                onVoiceClick={() => {}}
                accentColor={accentColor}
                dark={dark}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
