"use client";

import { motion } from "framer-motion";

export function DPAContent() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          📄 Data Processing Agreement (DPA)
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 space-y-1 text-slate-500"
        >
          <p>Effective Date: February 2025</p>
          <p className="mt-2 font-medium text-slate-700">Between:</p>
          <p>DentraFlow (&quot;Processor&quot;)</p>
          <p>and</p>
          <p>The Dental Clinic Customer (&quot;Controller&quot;)</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 space-y-8 text-slate-600 break-words"
        >
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Purpose</h2>
            <p className="mt-2">
              This Data Processing Agreement (&quot;DPA&quot;) governs the processing of personal data by DentraFlow on behalf of the Clinic in connection with the use of DentraFlow&apos;s SaaS platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Roles of the Parties</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>The Clinic is the Data Controller.</li>
              <li>DentraFlow acts as the Data Processor.</li>
              <li>The Clinic determines the purposes and means of processing patient data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Categories of Data Processed</h2>
            <p className="mt-2">
              DentraFlow may process:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Patient name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Appointment details</li>
              <li>Selected treatment category</li>
              <li>Payment confirmation status</li>
            </ul>
            <p className="mt-4">
              DentraFlow does not intentionally process medical treatment records or diagnostic information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Purpose of Processing</h2>
            <p className="mt-2">
              Personal data is processed solely to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Provide appointment booking services</li>
              <li>Send reminders</li>
              <li>Confirm deposit payments</li>
              <li>Operate and maintain the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Processor Obligations</h2>
            <p className="mt-2">
              DentraFlow agrees to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Process data only on documented instructions from the Clinic</li>
              <li>Maintain appropriate technical and organizational safeguards</li>
              <li>Restrict employee access to authorized personnel</li>
              <li>Notify the Clinic of data breaches without undue delay</li>
              <li>Assist the Clinic in responding to data subject requests (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Subprocessors</h2>
            <p className="mt-2">
              DentraFlow may use subprocessors such as:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Cloud hosting providers</li>
              <li>Payment processors (e.g., PayPal)</li>
              <li>Infrastructure providers</li>
            </ul>
            <p className="mt-4">
              DentraFlow ensures subprocessors are bound by confidentiality and data protection obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. International Data Transfers</h2>
            <p className="mt-2">
              Where data is transferred outside the EU/UK, DentraFlow will implement appropriate safeguards such as:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Standard contractual clauses</li>
              <li>Secure hosting environments</li>
              <li>Encryption in transit</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Security Measures</h2>
            <p className="mt-2">
              DentraFlow implements:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>HTTPS encryption</li>
              <li>Secure server infrastructure</li>
              <li>Access control restrictions</li>
              <li>Webhook validation for payment verification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Data Retention & Deletion</h2>
            <p className="mt-2">
              Upon termination of services:
            </p>
            <p className="mt-2">
              DentraFlow will delete or return personal data as instructed by the Clinic, unless required by law to retain it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Audit Rights</h2>
            <p className="mt-2">
              Upon reasonable written request, DentraFlow may provide information necessary to demonstrate compliance with this DPA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">11. Governing Law</h2>
            <p className="mt-2">
              This DPA shall be governed by the laws specified in the main Terms & Conditions agreement.
            </p>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">🚀 Important Implementation Note</h2>
            <p className="mt-2 text-amber-900 dark:text-amber-100">
              To be fully GDPR-compliant:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-amber-900 dark:text-amber-100">
              <li>Clinics should &quot;accept DPA&quot; during onboarding (checkbox + timestamp stored)</li>
              <li>Provide downloadable PDF version</li>
              <li>Include reference to DPA in your Terms</li>
            </ul>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
