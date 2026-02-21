import type { Metadata } from "next";
import { TermsContent } from "@/components/pages/TermsContent";

export const metadata: Metadata = {
  title: "Terms & Conditions | DentraFlow",
  description: "Terms and conditions for using DentraFlow services.",
};

export default function TermsPage() {
  return <TermsContent />;
}
