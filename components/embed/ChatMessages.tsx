"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TypingIndicator } from "./TypingIndicator";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

function TypingText({ text, accentColor, dark }: { text: string; accentColor: string; dark?: boolean }) {
  const [len, setLen] = useState(0);
  const full = text.length;
  useEffect(() => {
    if (len >= full) return;
    const step = full <= 40 ? 1 : full <= 120 ? 2 : 3;
    const t = setInterval(() => setLen((n) => Math.min(n + step, full)), 24);
    return () => clearInterval(t);
  }, [full, len]);
  return (
    <span>
      {text.slice(0, len)}
      {len < full && <span className="animate-pulse" style={{ color: accentColor }}>|</span>}
    </span>
  );
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  accentColor: string;
  dark?: boolean;
  onScroll?: (atBottom: boolean) => void;
}

export function ChatMessages({
  messages,
  isTyping,
  accentColor,
  dark,
  onScroll,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  useEffect(() => {
    if (!userScrolledRef.current && scrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || !onScroll) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom) userScrolledRef.current = false;
    onScroll(atBottom);
  };

  const handleWheel = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (!atBottom) userScrolledRef.current = true;
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onWheel={handleWheel}
      className={`flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 ${
        dark ? "scrollbar-dark" : "scrollbar-light"
      }`}
      style={{ scrollBehavior: "smooth" }}
    >
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  msg.role === "ai"
                    ? dark
                      ? "rounded-bl-md bg-slate-700 text-slate-100"
                      : "rounded-bl-md bg-slate-100 text-slate-800"
                    : dark
                      ? "rounded-br-md bg-slate-600 text-white"
                      : "rounded-br-md text-white"
                }`}
                style={msg.role === "user" ? { backgroundColor: accentColor } : undefined}
              >
                <p className="whitespace-pre-wrap">
                  {msg.role === "ai" ? (
                    <TypingText text={msg.text} accentColor={accentColor} dark={dark} />
                  ) : (
                    msg.text
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <div className="flex justify-start">
            <TypingIndicator accentColor={accentColor} dark={dark} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
