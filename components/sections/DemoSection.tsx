"use client";

import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, RotateCcw } from "lucide-react";
import {
  getDemoReply,
  INITIAL_DEMO_STATE,
  type DemoState,
} from "@/lib/demo-chat";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

const WELCOME_MESSAGE =
  "Hi! I'm the DentraFlow AI receptionist. Type in English, Spanish, Hindi, or French — I'll understand. Try: \"I'd like to book a cleaning\" or \"Quiero una cita\" to see a full booking flow until your appointment is confirmed.";

export function DemoSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "0", role: "ai", text: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>(INITIAL_DEMO_STATE);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setIsTyping(true);

    const { reply, nextState, booked } = getDemoReply(text, demoState);
    setDemoState(nextState);

    const delay = 500 + Math.min(reply.length * 12, 1200);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `ai-${Date.now()}`, role: "ai", text: reply }]);
      setIsTyping(false);
    }, delay);
  };

  const handleStartOver = () => {
    setMessages([
      { id: "0", role: "ai", text: WELCOME_MESSAGE },
    ]);
    setDemoState(INITIAL_DEMO_STATE);
  };

  const isBooked = demoState.step === "booked";

  return (
    <section id="demo" aria-label="Live demo of DentraFlow AI receptionist chat" className="overflow-x-hidden px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
        >
          DentraFlow in Action
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-center text-slate-600 text-sm sm:text-base"
        >
          Real chat with our AI receptionist — in English, Spanish, Hindi, or French. Book an appointment from start to finish below.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft sm:mt-10"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-500 sm:text-sm">DentraFlow • Live demo</span>
            </div>
            {isBooked && (
              <button
                type="button"
                onClick={handleStartOver}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Start over
              </button>
            )}
          </div>
          <div className="grid min-h-[320px] grid-cols-1 sm:min-h-[360px] lg:grid-cols-5">
            <div className="flex flex-col border-b border-slate-100 lg:col-span-3 lg:border-b-0 lg:border-r">
              <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-6">
                Chat — book until appointment confirmed
              </p>
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-4 sm:p-6">
                  <div className="flex flex-col gap-3">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[85%] ${
                            msg.role === "ai"
                              ? "rounded-bl-md bg-primary/10 text-slate-800"
                              : "rounded-br-md bg-primary text-white"
                          }`}
                        >
                          <span className="text-xs font-medium opacity-80">
                            {msg.role === "ai" ? "AI Agent" : "You"}
                          </span>
                          <p className="mt-0.5 whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </motion.div>
                    ))}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="rounded-2xl rounded-bl-md bg-primary/10 px-4 py-2.5 text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div ref={bottomRef} />
                </div>
                <div className="border-t border-slate-100 p-3 sm:p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g. I'd like to book a cleaning / Quiero una cita..."
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      disabled={isTyping}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white p-6 lg:col-span-2">
              <div className="w-full max-w-xs rounded-xl border border-slate-200/80 bg-white p-6 text-center shadow-soft">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700">Appointments today</p>
                <p className="text-2xl font-bold text-primary">24</p>
                <p className="mt-1 text-xs text-slate-500">3 from AI conversations</p>
                {isBooked && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700">
                    Demo booked
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
