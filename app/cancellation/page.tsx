import type { Metadata } from "next";
import { CancellationContent } from "@/components/pages/CancellationContent";

export const metadata: Metadata = {
  title: "Cancellation Policy | DentraFlow",
  description: "How to cancel your DentraFlow subscription.",
};

export default function CancellationPage() {
  return <CancellationContent />;
}
