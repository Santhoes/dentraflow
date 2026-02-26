"use client";

import { motion } from "framer-motion";

export function RefundContent() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Refund Policy
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
              This Refund Policy explains how refunds are handled for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Subscription fees paid by dental clinics to DentraFlow</li>
              <li>Appointment deposits paid by patients to dental clinics</li>
            </ul>
            <p className="mt-4">
              DentraFlow is a software platform and does not provide dental or medical services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION A — CLINIC SUBSCRIPTION REFUNDS</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Subscription Fees</h2>
            <p className="mt-2">
              DentraFlow offers subscription-based plans for dental clinics.
            </p>
            <p className="mt-2">
              Unless otherwise stated in writing:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Subscription fees are non-refundable.</li>
              <li>Partial months are not prorated.</li>
              <li>Failure to use the platform does not qualify for a refund.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Free Trials (If Applicable)</h2>
            <p className="mt-2">
              If a free trial is offered:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Clinics may cancel before the trial ends to avoid charges.</li>
              <li>Once a paid billing cycle begins, the subscription fee is non-refundable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Billing Errors</h2>
            <p className="mt-2">
              If you believe you were charged incorrectly, you must contact us within 14 days of the billing date.
            </p>
            <p className="mt-2">
              Verified billing errors will be corrected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION B — PATIENT APPOINTMENT DEPOSITS</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Deposit Payments</h2>
            <p className="mt-2">
              Appointment deposits are paid directly to the dental clinic through third-party payment providers (such as PayPal).
            </p>
            <p className="mt-2">DentraFlow:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Does not collect or hold patient funds</li>
              <li>Does not control clinic refund decisions</li>
              <li>Is not responsible for refund processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Clinic Cancellation Policies</h2>
            <p className="mt-2">
              Refund eligibility for appointment deposits is determined solely by the dental clinic&apos;s cancellation policy.
            </p>
            <p className="mt-2">
              Patients must review the clinic&apos;s cancellation terms before completing payment.
            </p>
            <p className="mt-2">
              For refund requests, patients must contact the dental clinic directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Payment Disputes & Chargebacks</h2>
            <p className="mt-2">
              If a patient initiates a dispute or chargeback:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>The dispute is handled between the patient, the clinic, and the payment provider.</li>
              <li>DentraFlow is not responsible for resolving payment disputes related to clinical services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION C — GENERAL PROVISIONS</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Service Interruptions</h2>
            <p className="mt-2">
              Temporary technical interruptions do not automatically qualify for subscription refunds.
            </p>
            <p className="mt-2">
              In cases of extended platform outages caused solely by DentraFlow, we may offer service credits at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Fraudulent Activity</h2>
            <p className="mt-2">
              DentraFlow reserves the right to refuse refunds in cases involving:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Abuse of the platform</li>
              <li>Fraudulent claims</li>
              <li>Violation of Terms & Conditions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Refund Policy at any time.
            </p>
            <p className="mt-2">
              Changes will be posted with an updated effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">11. Contact Information</h2>
            <p className="mt-2">
              For subscription-related refund inquiries:
            </p>
            <p className="mt-4 font-medium text-slate-800">DentraFlow</p>
            <p className="mt-1">Email: support@dentraflow.com</p>
            <p className="mt-1">Website: https://www.dentraflow.com</p>
            <p className="mt-6">
              For appointment deposit refunds:
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
