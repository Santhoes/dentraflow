import type { Metadata } from "next";
import { CookieContent } from "@/components/pages/CookieContent";

export const metadata: Metadata = {
  title: "Cookie Policy | DentraFlow",
  description: "How DentraFlow uses cookies and similar technologies on our website and platform.",
};

export default function CookiePolicyPage() {
  return <CookieContent />;
}
