"use client";

import { useEffect } from "react";

const INGEST = "http://127.0.0.1:7785/ingest/8b7a328f-cfbf-41bb-bc5d-dd8a87f78da9";
const SESSION = "f6ea83";

function send(payload: Record<string, unknown>) {
  fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
    body: JSON.stringify({ sessionId: SESSION, timestamp: Date.now(), ...payload }),
  }).catch(() => {});
}

export function ConsoleDebugCapture() {
  useEffect(() => {
    // #region agent log
    const onError = (event: ErrorEvent) => {
      send({
        location: "window.onerror",
        message: "Uncaught error",
        data: {
          msg: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack?.slice(0, 500),
        },
        hypothesisId: "A",
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      send({
        location: "unhandledrejection",
        message: "Unhandled rejection",
        data: {
          reason: typeof reason === "string" ? reason : (reason?.message ?? String(reason))?.slice(0, 300),
          stack: reason?.stack?.slice(0, 500),
        },
        hypothesisId: "B",
      });
    };
    const origError = console.error;
    const origWarn = console.warn;
    console.error = (...args: unknown[]) => {
      send({
        location: "console.error",
        message: "console.error",
        data: { args: args.map((a) => (typeof a === "object" && a !== null ? String(a) : a)).slice(0, 3) },
        hypothesisId: "C",
      });
      origError.apply(console, args);
    };
    console.warn = (...args: unknown[]) => {
      send({
        location: "console.warn",
        message: "console.warn",
        data: { args: args.map((a) => (typeof a === "object" && a !== null ? String(a) : a)).slice(0, 3) },
        hypothesisId: "D",
      });
      origWarn.apply(console, args);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      console.error = origError;
      console.warn = origWarn;
    };
    // #endregion
  }, []);
  return null;
}
