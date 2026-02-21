import type { Metadata } from "next";
import { RefundContent } from "@/components/pages/RefundContent";

export const metadata: Metadata = {
  title: "Refund Policy | DentraFlow",
  description: "Refund policy for DentraFlow subscriptions.",
};

export default function RefundPage() {
  return <RefundContent />;
}
