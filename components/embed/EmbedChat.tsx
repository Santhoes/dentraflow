"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

const SUGGESTIONS = [
  "Cleaning",
  "Checkup",
  "Pain or emergency",
  "Book appointment",
  "What are your hours?",
  "Do you take insurance?",
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
  const welcome = agentName?.trim()
    ? `Hi! I'm ${agentName.trim()} from ${displayName}. What can we help with? Tap below or type — cleaning, checkup, pain, or book.`
    : `Hi! I'm the AI receptionist for ${displayName}. What can we help with? Tap below or type — cleaning, checkup, pain, or book.`;
  const primary = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : DEFAULT_PRIMARY;
  const headerBg = headerBackgroundColor && /^#[0-9A-Fa-f]{6}$/.test(headerBackgroundColor) ? headerBackgroundColor : undefined;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "0", role: "ai", text: welcome },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const greetingSoundPlayed = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (greetingSoundPlayed.current) return;
    const t = setTimeout(() => {
      if (greetingSoundPlayed.current) return;
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
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
        greetingSoundPlayed.current = true;
      } catch {
        greetingSoundPlayed.current = true;
      }
    }, 450);
    return () => clearTimeout(t);
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    setInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setIsTyping(true);

    const chatHistory = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${base}/api/embed/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          clinicSlug,
          locationId: locationId || undefined,
          agentId: agentId || undefined,
          sig,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        res.ok && data.message
          ? data.message
          : "Sorry, something went wrong. Try: Cleaning • Checkup • Book • Hours • Insurance?";
      setMessages((m) => [...m, { id: `ai-${Date.now()}`, role: "ai", text: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          text: "Sorry, I couldn't connect. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full min-h-[50dvh] flex-col bg-white tap-highlight-none safe-area-padding sm:min-h-[400px]" style={{ ["--embed-primary" as string]: primary, ["--embed-header-bg" as string]: headerBg ?? "#f8fafc" }}>
      <div
        className={`flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 sm:py-2 min-h-[44px] ${!headerBg ? "bg-slate-50" : ""}`}
        style={headerBg ? { backgroundColor: headerBg } : undefined}
      >
        {logoUrl ? (
          <span className="relative inline-flex shrink-0">
            <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
          </span>
        ) : null}
        <span className="text-sm font-medium text-slate-700 truncate">{displayName} — Chat</span>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-3">
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
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-3 py-2 text-slate-400" style={{ backgroundColor: `${primary}20` }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-slate-100 p-2">
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
    </div>
  );
}
