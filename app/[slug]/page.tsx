import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { signClinicSlug } from "@/lib/chat-signature";
import { EmbedChatClient } from "@/components/embed/EmbedChatClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RESERVED_SLUGS = new Set([
  "about",
  "admin",
  "app",
  "api",
  "contact",
  "cookie",
  "dpa",
  "embed",
  "login",
  "pricing",
  "privacy",
  "refund",
  "reset-password",
  "shipping",
  "signup",
  "terms",
]);

interface ClinicRow {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  logo_url?: string | null;
  widget_primary_color?: string | null;
  widget_background_color?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export default async function ClinicPublicPage({
  params,
}: {
  params: { slug: string };
}) {
  const rawSlug = params.slug?.trim().toLowerCase();
  if (!rawSlug || RESERVED_SLUGS.has(rawSlug)) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: clinic, error } = await admin
    .from("clinics")
    .select(
      "id, name, slug, plan, logo_url, widget_primary_color, widget_background_color, address_line1, address_line2, city, state, postal_code, country",
    )
    .eq("slug", rawSlug)
    .limit(1)
    .maybeSingle<ClinicRow>();

  if (error || !clinic) {
    notFound();
  }

  if (clinic.plan !== "smart_booking") {
    notFound();
  }

  const sig = signClinicSlug(clinic.slug);
  if (!sig) {
    notFound();
  }

  const addressParts = [
    clinic.address_line1?.trim(),
    clinic.address_line2?.trim(),
    [clinic.city, clinic.state].filter(Boolean).join(", ") || null,
    clinic.postal_code?.trim(),
    clinic.country?.trim(),
  ].filter(Boolean);
  const address = addressParts.join(" • ");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            {clinic.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clinic.logo_url}
                alt={clinic.name}
                className="h-10 w-10 rounded-lg object-contain bg-white shadow-sm"
              />
            ) : null}
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">{clinic.name}</h1>
              {address ? (
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{address}</p>
              ) : null}
            </div>
          </div>
          <div className="hidden text-right text-xs text-slate-400 sm:block">
            <p className="font-medium text-slate-500">Powered by DentraFlow</p>
            <p>Smart Booking Site</p>
          </div>
        </header>

        <main className="mt-6 flex flex-1 flex-col gap-6 lg:flex-row">
          <section className="flex-1 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Book your next visit in minutes
            </h2>
            <p className="text-sm text-slate-600 sm:text-base">
              Tell our AI receptionist what you need, and it will find the best time for you.
              You can ask questions, change, or cancel later — all in this chat.
            </p>
            <ul className="mt-3 grid gap-2 text-xs text-slate-600 sm:text-sm md:grid-cols-2">
              <li className="rounded-lg bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                • Available 24/7 — no phone tag
              </li>
              <li className="rounded-lg bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                • Secure, HIPAA-conscious booking flow
              </li>
              <li className="rounded-lg bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                • Automatic confirmations & reminders
              </li>
              <li className="rounded-lg bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                • Change or cancel via chat anytime
              </li>
            </ul>
          </section>

          <section className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Smart Booking
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  Chat with our AI receptionist
                </p>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Live
              </div>
            </div>
            <div className="h-[480px] max-h-[70vh]">
              <EmbedChatClient slug={clinic.slug} sig={sig} locationId={null} agentId={null} />
            </div>
          </section>
        </main>

        <footer className="mt-6 border-t border-slate-200 pt-4 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-center text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Medical Disclaimer</p>
            <p className="mt-1.5 leading-relaxed">
              This clinic is independently owned and operated. DentraFlow provides appointment booking technology only
              and does not provide medical services, diagnosis, or treatment. All medical services, clinical decisions,
              and patient care are the sole responsibility of the clinic.
            </p>
            <p className="mt-2 leading-relaxed">
              By booking an appointment, you acknowledge that DentraFlow acts solely as a technology provider
              facilitating scheduling on behalf of the clinic.
            </p>
          </div>
          <p className="text-center text-xs text-slate-400">
            Powered by DentraFlow • AI booking for modern dental clinics
          </p>
        </footer>
      </div>
    </div>
  );
}

