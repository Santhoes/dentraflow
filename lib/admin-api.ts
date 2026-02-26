"use client";

export async function adminFetch(path: string, options: RequestInit = {}) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${base}/api/admin${p}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || res.statusText);
  }
  return res.json();
}
