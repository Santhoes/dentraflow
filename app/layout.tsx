import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/LayoutShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PLANS } from "@/lib/supabase/types";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "DentraFlow – AI Dental Receptionist for 24/7 Appointment Booking",
  description:
    "DentraFlow is an AI-powered dental receptionist that books appointments, sends reminders, syncs with Google Calendar, and works 24/7. Reduce no-shows and fill more chairs automatically.",
  keywords: [
    "AI dental receptionist",
    "dental booking software",
    "dental appointment automation",
    "chatbot for dentists",
    "reduce dental no-shows",
    "dental clinic AI assistant",
  ],
  authors: [{ name: "DentraFlow" }],
  metadataBase: new URL(siteUrl),
  alternates: { canonical: siteUrl },
  robots: "index, follow",
  openGraph: {
    // Add public/og-image.png (1200×630) for social previews when not using dynamic OG.
    title: "AI Dental Receptionist That Books Patients 24/7 | DentraFlow",
    description:
      "Never miss another appointment. Automate bookings, reminders, and patient chats with DentraFlow.",
    type: "website",
    url: siteUrl,
    siteName: "DentraFlow",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DentraFlow – AI Dental Receptionist for 24/7 Appointment Booking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Dental Receptionist That Books Patients 24/7 | DentraFlow",
    description:
      "Never miss another appointment. Automate bookings, reminders, and patient chats with DentraFlow.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
};

function StructuredDataScript() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DentraFlow",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Dental Practice Management",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "DentraFlow is an AI-powered dental receptionist that books appointments, sends reminders, syncs with Google Calendar, and works 24/7. Reduce no-shows and fill more chairs automatically.",
    provider: {
      "@type": "Organization",
      name: "DentraFlow",
      url: siteUrl,
    },
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: plan.priceCents / 100,
      priceCurrency: "USD",
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      description: plan.description,
    })),
    industry: "Healthcare",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased font-sans flex flex-col bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 tap-highlight-none">
        <StructuredDataScript />
        <ThemeProvider>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
