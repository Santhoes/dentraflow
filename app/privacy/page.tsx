import type { Metadata } from "next";
import { PrivacyContent } from "@/components/pages/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy | DentraFlow",
  description: "Privacy policy for DentraFlow and how we handle your data.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
