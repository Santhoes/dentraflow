"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Mic, MicOff, X } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

/** Typing animation: reveal AI message character by character */
function TypingText({ text, primary }: { text: string; primary: string }) {
  const [visibleLen, setVisibleLen] = useState(0);
  const fullLen = text.length;
  useEffect(() => {
    if (visibleLen >= fullLen) return;
    const step = fullLen <= 40 ? 1 : fullLen <= 120 ? 2 : 3;
    const t = setInterval(() => {
      setVisibleLen((n) => Math.min(n + step, fullLen));
    }, 24);
    return () => clearInterval(t);
  }, [fullLen, visibleLen]);
  return <span>{text.slice(0, visibleLen)}{visibleLen < fullLen && <span className="animate-pulse" style={{ color: primary }}>|</span>}</span>;
}

const SUGGESTIONS = [
  "🦷 Pain",
  "🧼 Cleaning",
  "📅 Checkup",
  "📆 Book Appointment",
  "Hours",
  "Insurance",
];

interface EmbedChatProps {
  clinicName: string;
  locationName?: string;
  agentName?: string;
  agentId?: string;
  clinicSlug: string;
  locationId?: string;
  sig: string;
  logoUrl?: string;
  primaryColor?: string;
  headerBackgroundColor?: string;
}

const DEFAULT_PRIMARY = "#0d9488";

export function EmbedChat({ clinicName, locationName, agentName, agentId, clinicSlug, locationId, sig, logoUrl, primaryColor, headerBackgroundColor }: EmbedChatProps) {
  const displayName = locationName ? `${clinicName} — ${locationName}` : clinicName;
  const welcome = "Hi 👋 How can we help today?";
  const primary = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : DEFAULT_PRIMARY;
  const headerBg = headerBackgroundColor && /^#[0-9A-Fa-f]{6}$/.test(headerBackgroundColor) ? headerBackgroundColor : undefined;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "0", role: "ai", text: welcome },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [connectTryCount, setConnectTryCount] = useState(0);
  const TRY_AGAIN_MAX = 3;
  const bottomRef = useRef<HTMLDivElement>(null);
  const greetingSoundPlayed = useRef(false);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    const win = typeof window !== "undefined" ? window : null;
    const api = win && (win as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (win as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    setVoiceSupported(!!api);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const minimize = () => {
    try {
      if (typeof window !== "undefined" && window.self !== window.parent) {
        window.parent.postMessage({ type: "dentraflow-minimize" }, "*");
      }
    } catch { /* noop */ }
  };

  const startVoiceInput = () => {
    const win = typeof window !== "undefined" ? window : null;
    const SpeechRecognitionAPI = win && ((win as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition || (win as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition);
    if (!SpeechRecognitionAPI || isListening || isTyping) return;
    const recognition = new SpeechRecognitionAPI() as { continuous: boolean; interimResults: boolean; lang: string; onstart: () => void; onend: () => void; onerror: () => void; onresult: (e: { results?: { [i: number]: { [j: number]: { transcript?: string } } } }) => void; start: () => void };
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: { results?: { [key: number]: { [key: number]: { transcript?: string } } } }) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.start();
  };

  const playGreetingSound = () => {
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
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    playGreetingSound();
    setInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setIsTyping(true);

    const chatHistory = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.text,
    }));

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
        }),
      });
      const data = await res.json().catch(() => ({})) as { message?: string; reset_conversation?: boolean; failed_attempts?: number };
      if (res.status === 429) {
        const next = connectTryCount + 1;
        setConnectTryCount(next);
        const msg =
          next >= TRY_AGAIN_MAX
            ? "Too many messages. You can try a new booking, change/cancel, or go back."
            : data.message || `Too many messages (${next} of ${TRY_AGAIN_MAX}).`;
        setMessages((m) => [...m, { id: `ai-${Date.now()}`, role: "ai", text: msg }]);
      } else if (data.reset_conversation) {
        setFailedAttempts(0);
        setConnectTryCount(0);
        const msg = data.message || "Let's start fresh 🙂 What can we help with? Pain • Cleaning • Checkup • Book";
        setMessages([
          { id: "0", role: "ai", text: welcome },
          { id: `ai-${Date.now()}`, role: "ai", text: msg },
        ]);
      } else {
        setConnectTryCount(0);
        if (typeof data.failed_attempts === "number") setFailedAttempts(data.failed_attempts);
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
      const msg =
        next >= TRY_AGAIN_MAX
          ? "I couldn't connect. You can try a new booking, change/cancel, or go back."
          : `Sorry, I couldn't connect (${next} of ${TRY_AGAIN_MAX}).`;
      setMessages((m) => [...m, { id: `ai-${Date.now()}`, role: "ai", text: msg }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full min-h-[50dvh] flex-col bg-white tap-highlight-none safe-area-padding sm:min-h-[400px]" style={{ ["--embed-primary" as string]: primary, ["--embed-header-bg" as string]: headerBg ?? "#f8fafc" }}>
      {/* Fixed header */}
      <header
        className={`flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2.5 sm:py-2 min-h-[44px] ${!headerBg ? "bg-slate-50" : ""}`}
        style={headerBg ? { backgroundColor: headerBg } : undefined}
      >
        {logoUrl ? (
          <span className="relative inline-flex shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic external logo with onError fallback */}
            <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{displayName} — Chat</span>
        <button
          type="button"
          onClick={minimize}
          className="shrink-0 rounded-full p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ ["--tw-ring-color" as string]: primary }}
          aria-label="Minimize chat"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      {/* Scrollable messages */}
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "ai"
                    ? "rounded-bl-md text-slate-800"
                    : "rounded-br-md text-white"
                }`}
                style={
                  msg.role === "ai"
                    ? { backgroundColor: `${primary}20` }
                    : { backgroundColor: primary }
                }
              >
                <p className="whitespace-pre-wrap">
                  {msg.role === "ai" ? (
                    <TypingText text={msg.text} primary={primary} />
                  ) : (
                    msg.text
                  )}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md px-3 py-2 text-slate-400" style={{ backgroundColor: `${primary}20` }}>
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>
      {/* Fixed bottom: suggestions + input */}
      <div className="shrink-0 border-t border-slate-200 bg-white p-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={isTyping}
              className="min-h-[36px] rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 touch-manipulation sm:min-h-0 sm:py-1.5 transition-colors duration-150"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          {voiceSupported && (
            <button
              type="button"
              onClick={startVoiceInput}
              disabled={isTyping}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:h-9 sm:w-9"
              style={isListening ? { borderColor: primary, color: primary } : undefined}
              aria-label={isListening ? "Listening…" : "Voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type here..."
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 sm:min-h-0 sm:py-2"
            style={{ ["--tw-ring-color" as string]: primary }}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white hover:opacity-90 active:opacity-80 disabled:opacity-50 sm:h-9 sm:w-9 transition-opacity duration-150"
            style={{ backgroundColor: primary }}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
