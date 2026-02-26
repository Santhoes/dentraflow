"use client";

import { motion } from "framer-motion";

export function CancellationContent() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Cancellation Policy
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 space-y-1 text-slate-500"
        >
          <p>Effective Date: February 2025</p>
          <p>Company Name: DentraFlow</p>
          <p>Website: https://www.dentraflow.com</p>
          <p>Contact Email: support@dentraflow.com</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 space-y-8 text-slate-600 break-words"
        >
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Overview</h2>
            <p className="mt-2">
              This Cancellation Policy explains:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>How dental clinics may cancel their DentraFlow subscription</li>
              <li>How patients may cancel appointments booked through DentraFlow</li>
            </ul>
            <p className="mt-4">
              DentraFlow is a software platform and does not provide dental or medical services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION A — CLINIC SUBSCRIPTION CANCELLATION</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Subscription Cancellation by Clinics</h2>
            <p className="mt-2">
              Clinics may cancel their subscription at any time through their account dashboard or by contacting DentraFlow support.
            </p>
            <p className="mt-2">Cancellation will take effect:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>At the end of the current billing cycle</li>
              <li>Access will continue until the billing period expires</li>
            </ul>
            <p className="mt-4">
              No partial refunds are provided for unused time unless otherwise agreed in writing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Account Suspension or Termination</h2>
            <p className="mt-2">
              DentraFlow reserves the right to suspend or terminate accounts if a clinic:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Violates the Terms & Conditions</li>
              <li>Engages in fraudulent activity</li>
              <li>Uses the platform unlawfully</li>
            </ul>
            <p className="mt-4">
              In such cases, refunds may not be issued.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION B — PATIENT APPOINTMENT CANCELLATION</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Appointment Cancellations</h2>
            <p className="mt-2">
              Patients who book appointments through DentraFlow are booking directly with the dental clinic.
            </p>
            <p className="mt-2">
              Appointment cancellation policies are determined solely by the dental clinic.
            </p>
            <p className="mt-2">DentraFlow:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Does not control clinic cancellation rules</li>
              <li>Does not approve or deny refund requests</li>
              <li>Does not guarantee deposit refunds</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Deposit & No-Show Policies</h2>
            <p className="mt-2">
              If a clinic requires a deposit:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>The clinic sets the cancellation window (e.g., 24–48 hours notice).</li>
              <li>Failure to cancel within the required timeframe may result in deposit forfeiture.</li>
            </ul>
            <p className="mt-4">
              Patients must review and agree to the clinic&apos;s cancellation terms before confirming payment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. How to Cancel an Appointment</h2>
            <p className="mt-2">
              Patients may cancel appointments by:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Using the cancellation link (if provided)</li>
              <li>Contacting the dental clinic directly</li>
            </ul>
            <p className="mt-4">
              DentraFlow may provide cancellation tools but does not make refund decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION C — TECHNICAL ISSUES</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Platform Errors</h2>
            <p className="mt-2">
              If a cancellation issue occurs due to a technical error on DentraFlow&apos;s platform, users must contact support promptly.
            </p>
            <p className="mt-2">
              Verified technical issues may be reviewed on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION D — GENERAL TERMS</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Limitation of Responsibility</h2>
            <p className="mt-2">
              DentraFlow is not responsible for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Clinic no-show policies</li>
              <li>Deposit forfeiture</li>
              <li>Disputes between patients and clinics</li>
              <li>Medical service outcomes</li>
            </ul>
            <p className="mt-4">
              All clinical services and policies are managed by the dental clinic.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Cancellation Policy from time to time.
            </p>
            <p className="mt-2">
              Changes will be posted with a revised effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Contact Information</h2>
            <p className="mt-2">
              For subscription cancellation inquiries:
            </p>
            <p className="mt-4 font-medium text-slate-800">DentraFlow</p>
            <p className="mt-1">Email: support@dentraflow.com</p>
            <p className="mt-1">Website: https://www.dentraflow.com</p>
            <p className="mt-6">
              For appointment cancellation or deposit questions:
            </p>
            <p className="mt-2">
              Please contact the dental clinic directly.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
