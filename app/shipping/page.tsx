import type { Metadata } from "next";
import { ShippingContent } from "@/components/pages/ShippingContent";

export const metadata: Metadata = {
  title: "Shipping Policy | DentraFlow",
  description: "DentraFlow is a digital-only service. This policy explains how and when you receive access to the Service.",
};

export default function ShippingPage() {
  return <ShippingContent />;
}
