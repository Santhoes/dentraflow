import type { Metadata } from "next";
import { DPAContent } from "@/components/pages/DPAContent";

export const metadata: Metadata = {
  title: "Data Processing Agreement (DPA) | DentraFlow",
  description: "Data Processing Agreement between DentraFlow and dental clinic customers for GDPR-compliant processing of patient data.",
};

export default function DPAPage() {
  return <DPAContent />;
}
