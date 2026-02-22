"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Mic, MicOff } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceSupported: boolean;
  isListening: boolean;
  onVoiceClick: () => void;
  accentColor: string;
  dark?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Type a message...",
  voiceSupported,
  isListening,
  onVoiceClick,
  accentColor,
  dark,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = value.trim();
    if (t && !disabled) onSend(t);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex shrink-0 items-center gap-2 border-t px-3 py-2 sm:px-4 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${
        dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`min-h-[44px] sm:h-12 min-w-0 flex-1 rounded-full border px-3 py-2.5 sm:px-4 text-base sm:text-sm focus:outline-none focus-visible:ring-2 touch-manipulation ${
          dark
            ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-400"
            : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-500"
        }`}
        style={{ ["--tw-ring-color" as string]: accentColor }}
        aria-label="Message"
      />
      {voiceSupported && (
        <motion.button
          type="button"
          onClick={onVoiceClick}
          disabled={disabled}
          className={`flex min-h-[44px] min-w-[44px] sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 touch-manipulation ${
            dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
          } ${isListening ? "" : ""}`}
          style={isListening ? { backgroundColor: `${accentColor}20`, color: accentColor } : undefined}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label={isListening ? "Listening…" : "Voice input"}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </motion.button>
      )}
      <motion.button
        type="submit"
        disabled={!value.trim() || disabled}
        className="flex min-h-[44px] min-w-[44px] sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:opacity-50 touch-manipulation"
        style={{ backgroundColor: accentColor }}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        aria-label="Send"
      >
        <Send className="h-5 w-5" />
      </motion.button>
    </form>
  );
}
