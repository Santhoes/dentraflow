"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/sections/Footer";
import { ConsoleDebugCapture } from "@/components/ConsoleDebugCapture";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isApp = pathname?.startsWith("/app");
  const isEmbed = pathname?.startsWith("/embed");

  if (isAdmin || isApp || isEmbed) {
    return (
      <>
        <ConsoleDebugCapture />
        {children}
      </>
    );
  }
  return (
    <>
      <ConsoleDebugCapture />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
