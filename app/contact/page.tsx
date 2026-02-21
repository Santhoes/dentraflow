import type { Metadata } from "next";
import { ContactContent } from "@/components/pages/ContactContent";

export const metadata: Metadata = {
  title: "Contact | DentraFlow",
  description: "Get in touch with DentraFlow for support or sales.",
};

export default function ContactPage() {
  return <ContactContent />;
}
