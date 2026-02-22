"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatLauncher } from "./ChatLauncher";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessage } from "./ChatMessages";

const STORAGE_DARK = "dentraflow-embed-dark";
const STORAGE_OPEN = "dentraflow-embed-open";
const INACTIVITY_MS = 10 * 60 * 1000;
const DEFAULT_ACCENT = "#1D4ED8";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Extract a selected date (YYYY-MM-DD) from recent user messages for time-only slot labels. */
function extractSelectedDateFromMessages(messages: { role: string; text: string }[]): string | null {
  for (let i = messages.length - 1; i >= 0 && messages.length - i <= 6; i--) {
    const m = messages[i];
    if (m?.role !== "user" || !m.text) continue;
    const match = m.text.trim().match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (match && ISO_DATE_RE.test(match[1])) return match[1];
  }
  return null;
}

export interface SuggestionItem {
  label: string;
  value?: string;
}

class EmbedErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError = () => ({ hasError: true });
  componentDidCatch() {
    this.setState({ hasError: true });
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export interface ChatWidgetConfig {
  clinicName: string;
  locationName?: string;
  agentName?: string;
  agentId?: string;
  clinicSlug: string;
  locationId?: string;
  sig: string;
  logoUrl?: string;
  primaryColor?: string;
}

export function ChatWidget(config: ChatWidgetConfig) {
  const {
    clinicName,
    locationName,
    agentName,
    agentId,
    clinicSlug,
    locationId,
    sig,
    logoUrl,
    primaryColor,
  } = config;

  const displayName = locationName ? `${clinicName} — ${locationName}` : clinicName;
  const welcome = agentName?.trim()
    ? `Hi 👋 How can we help today?`
    : `Hi 👋 How can we help today?`;

  const accentColor = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : DEFAULT_ACCENT;
  const isElite = !!primaryColor && primaryColor !== DEFAULT_ACCENT;

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "0", role: "ai", text: welcome }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [connectTryCount, setConnectTryCount] = useState(0);
  const [chipsVisible, setChipsVisible] = useState(true);
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestionItem[]>([]);
  const [inactivityMessage, setInactivityMessage] = useState<string | null>(null);

  const TRY_AGAIN_MAX = 3;
  const tryAgainChips: SuggestionItem[] = [
    { label: "Book Appointment" },
    { label: "Change / Cancel" },
    { label: "Back" },
  ];

  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingSoundPlayed = useRef(false);

  useEffect(() => {
    setMounted(true);
    const storedDark = typeof window !== "undefined" ? localStorage.getItem(STORAGE_DARK) : null;
    if (storedDark !== null) setDark(storedDark === "1");
    else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) setDark(true);
    const storedOpen = typeof window !== "undefined" ? localStorage.getItem(STORAGE_OPEN) : null;
    if (storedOpen === "1") setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_DARK, dark ? "1" : "0");
    }
  }, [mounted, dark]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_OPEN, isOpen ? "1" : "0");
    }
  }, [mounted, isOpen]);

  useEffect(() => {
    const win = typeof window !== "undefined" ? window : null;
    const api =
      win &&
      ((win as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
        (win as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
    setVoiceSupported(!!api);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setInactivityMessage(null);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    inactivityTimerRef.current = setTimeout(() => {
      setInactivityMessage("Still there? I can help 🙂");
    }, INACTIVITY_MS);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isOpen, resetInactivityTimer]);

  const playGreetingSound = useCallback(() => {
    if (greetingSoundPlayed.current) return;
    greetingSoundPlayed.current = true;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* noop */ }
  }, []);

  const minimize = useCallback(() => {
    try {
      if (typeof window !== "undefined" && window.self !== window.parent) {
        window.parent.postMessage({ type: "dentraflow-minimize" }, "*");
      }
    } catch { /* noop */ }
    setIsOpen(false);
  }, []);

  const startVoiceInput = useCallback(() => {
    const win = typeof window !== "undefined" ? window : null;
    const SpeechRecognitionAPI =
      win &&
      ((win as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
        (win as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition);
    if (!SpeechRecognitionAPI || isListening || isTyping) return;
    const recognition = new SpeechRecognitionAPI() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: () => void;
      onend: () => void;
      onerror: () => void;
      onresult: (e: { results?: { [i: number]: { [j: number]: { transcript?: string } } } }) => void;
      start: () => void;
    };
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: { results?: { [key: number]: { [key: number]: { transcript?: string } } } }) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.start();
  }, [isListening, isTyping]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;
      resetInactivityTimer();
      playGreetingSound();
      setInput("");
      const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: trimmed };
      setMessages((m) => [...m, userMsg]);
      setSuggestedSlots([]);
      if (chipsVisible) setChipsVisible(false);
      setIsTyping(true);

      const chatHistory = [...messages, userMsg].map((m) => ({ role: m.role, content: m.text }));

      try {
        const isEmbed =
          typeof window !== "undefined" &&
          typeof window.location?.pathname === "string" &&
          window.location.pathname.startsWith("/embed");
        const base = isEmbed
          ? (process.env.NEXT_PUBLIC_APP_URL || "https://www.dentraflow.com").replace(/\/$/, "")
          : ((typeof window !== "undefined" ? window.location.origin : "") ||
              process.env.NEXT_PUBLIC_APP_URL ||
              "https://www.dentraflow.com").replace(/\/$/, "");
        const selectedDate = extractSelectedDateFromMessages(messages);
        const res = await fetch(`${base}/api/embed/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatHistory,
            clinicSlug,
            locationId: locationId || undefined,
            agentId: agentId || undefined,
            sig,
            failed_attempts: failedAttempts,
            ...(selectedDate ? { selectedDate } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          reset_conversation?: boolean;
          failed_attempts?: number;
          suggested_slots?: { label: string; value: string }[];
        };
        if (res.status === 429) {
          const next = connectTryCount + 1;
          setConnectTryCount(next);
          if (next >= TRY_AGAIN_MAX) {
            setMessages((m) => [
              ...m,
              { id: `ai-${Date.now()}`, role: "ai", text: "Too many messages. You can try a new booking, change/cancel, or go back." },
            ]);
            setChipsVisible(true);
            setSuggestedSlots(tryAgainChips);
          } else {
            setMessages((m) => [
              ...m,
              { id: `ai-${Date.now()}`, role: "ai", text: data.message || `Too many messages. Please wait a minute (${next} of ${TRY_AGAIN_MAX}).` },
            ]);
          }
        } else if (data.reset_conversation) {
          setFailedAttempts(0);
          setConnectTryCount(0);
          setSuggestedSlots([]);
          const msg = data.message || "Let's start fresh 🙂 What can we help with? Pain • Cleaning • Checkup • Book";
          setMessages([
            { id: "0", role: "ai", text: welcome },
            { id: `ai-${Date.now()}`, role: "ai", text: msg },
          ]);
          setChipsVisible(true);
        } else {
          setConnectTryCount(0);
          if (typeof data.failed_attempts === "number") setFailedAttempts(data.failed_attempts);
          if (Array.isArray(data.suggested_slots) && data.suggested_slots.length > 0) {
            setSuggestedSlots(data.suggested_slots);
          } else {
            setSuggestedSlots([]);
          }
          const reply =
            res.ok && data.message
              ? data.message
              : typeof data.message === "string"
                ? data.message
                : "Sorry, something went wrong. Try: Pain • Cleaning • Checkup • Book • Hours • Insurance?";
          setMessages((m) => [...m, { id: `ai-${Date.now()}`, role: "ai", text: reply }]);
        }
      } catch {
        const next = connectTryCount + 1;
        setConnectTryCount(next);
        if (next >= TRY_AGAIN_MAX) {
          setMessages((m) => [
            ...m,
            { id: `ai-${Date.now()}`, role: "ai", text: "I couldn't connect. You can try a new booking, change/cancel, or go back." },
          ]);
          setChipsVisible(true);
          setSuggestedSlots(tryAgainChips);
        } else {
          setMessages((m) => [
            ...m,
            { id: `ai-${Date.now()}`, role: "ai", text: `Sorry, I couldn't connect (${next} of ${TRY_AGAIN_MAX}).` },
          ]);
        }
      } finally {
        setIsTyping(false);
      }
    },
    [
      isTyping,
      messages,
      chipsVisible,
      failedAttempts,
      connectTryCount,
      clinicSlug,
      locationId,
      agentId,
      sig,
      welcome,
      resetInactivityTimer,
      playGreetingSound,
    ]
  );

  const handleChipSelect = useCallback(
    (keyOrLabel: string, _label?: string, value?: string) => {
      const toSend = value ?? keyOrLabel;
      send(toSend);
      if (value) setSuggestedSlots([]);
    },
    [send]
  );

  const suggestionItems: SuggestionItem[] =
    suggestedSlots.length > 0
      ? suggestedSlots
      : chipsVisible
        ? [
            { label: "🦷 Pain" },
            { label: "🧼 Cleaning" },
            { label: "📅 Checkup" },
            { label: "📆 Book Appointment" },
            { label: "Hours" },
            { label: "Insurance" },
          ]
        : [];

  const showSuggestions = suggestionItems.length > 0;

  if (!mounted) {
    return (
      <div
        className="fixed z-[99999] flex min-h-[48px] min-w-[48px] items-center justify-center sm:h-14 sm:w-14"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))", right: "max(1rem, env(safe-area-inset-right))" }}
        aria-hidden
      >
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
      </div>
    );
  }

  return (
    <EmbedErrorBoundary
      fallback={
        <div
          className="fixed z-[99999] flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:h-14 sm:w-14"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))", right: "max(1rem, env(safe-area-inset-right))" }}
        >
          <span className="text-xs">Error</span>
        </div>
      }
    >
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed z-[99999]"
            style={{ bottom: "max(1rem, env(safe-area-inset-bottom))", right: "max(1rem, env(safe-area-inset-right))" }}
          >
            <ChatLauncher
              onClick={() => {
                setIsOpen(true);
                resetInactivityTimer();
              }}
              accentColor={accentColor}
              isElite={isElite}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        <ChatPanel
          isOpen={isOpen}
          onClose={minimize}
          displayName={displayName}
          logoUrl={logoUrl}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          accentColor={accentColor}
          messages={messages}
          isTyping={isTyping}
          input={input}
          onInputChange={setInput}
          onSend={send}
          voiceSupported={voiceSupported}
          isListening={isListening}
          onVoiceClick={startVoiceInput}
          suggestionItems={suggestionItems}
          showSuggestions={showSuggestions}
          onChipSelect={handleChipSelect}
          inactivityMessage={inactivityMessage}
        />
      </AnimatePresence>
    </EmbedErrorBoundary>
  );
}
