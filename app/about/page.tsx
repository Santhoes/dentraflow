import type { Metadata } from "next";
import { AboutContent } from "@/components/pages/AboutContent";

export const metadata: Metadata = {
  title: "About | DentraFlow",
  description: "Learn about DentraFlow — the AI receptionist built for modern dental clinics.",
};

export default function AboutPage() {
  return <AboutContent />;
}
