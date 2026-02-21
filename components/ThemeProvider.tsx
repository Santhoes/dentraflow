"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "dentraflow_theme";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "light" || s === "dark" || s === "system") return s;
  } catch {}
  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const effective = isAdmin
      ? (theme === "system" ? getSystemTheme() : theme)
      : "light";
    setResolved(effective);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(effective);
  }, [theme, mounted, isAdmin]);

  useEffect(() => {
    if (!mounted || !isAdmin) return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setResolved((r) => (theme === "system" ? "dark" : r));
    const off = () => setResolved((r) => (theme === "system" ? "light" : r));
    m.addEventListener("change", m.matches ? on : off);
    return () => {
      m.removeEventListener("change", m.matches ? on : off);
    };
  }, [mounted, theme, isAdmin]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  const value: ThemeContextValue = {
    theme,
    resolved,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
