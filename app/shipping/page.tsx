import type { Metadata } from "next";
import { ShippingContent } from "@/components/pages/ShippingContent";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy | DentraFlow",
  description: "DentraFlow is a digital-only SaaS platform. This policy explains how services are delivered.",
};

export default function ShippingPage() {
  return <ShippingContent />;
}
