"use client";

import { useEffect } from "react";

/**
 * Makes the embed iframe document body transparent so when the chat is
 * minimized/closed only the launcher is visible and no white background shows.
 */
export function EmbedBodyTransparent({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    body.classList.add("embed-iframe-transparent");
    html.setAttribute("data-embed", "true");
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    html.style.setProperty("background", "transparent", "important");
    html.style.setProperty("background-color", "transparent", "important");
    body.style.setProperty("background", "transparent", "important");
    body.style.setProperty("background-color", "transparent", "important");
    return () => {
      body.classList.remove("embed-iframe-transparent");
      html.removeAttribute("data-embed");
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
    };
  }, []);
  return <>{children}</>;
}
