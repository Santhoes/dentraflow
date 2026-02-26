"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function TermsContent() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Terms & Conditions
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
            <h2 className="text-xl font-semibold text-slate-900">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using DentraFlow&apos;s website or services, you agree to be bound by these Terms & Conditions.
            </p>
            <p className="mt-2">
              If you do not agree, you must not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Description of Services</h2>
            <p className="mt-2">
              DentraFlow provides AI-powered appointment scheduling and communication software for dental clinics.
            </p>
            <p className="mt-2">DentraFlow:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Is a technology platform</li>
              <li>Does not provide medical or dental services</li>
              <li>Does not diagnose or treat patients</li>
              <li>Does not control clinic operations</li>
            </ul>
            <p className="mt-4">
              Dental services are provided solely by independent dental clinics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Hosted Booking Pages</h2>
            <p className="mt-2">
              DentraFlow may provide hosted booking pages under URLs such as:
            </p>
            <p className="mt-2 font-mono text-sm text-slate-700">
              dentraflow.com/&#123;clinic-name&#125;
            </p>
            <p className="mt-2">
              These pages are created and managed for independent healthcare providers (&quot;Clinics&quot;) to facilitate appointment scheduling and patient communication.
            </p>
            <p className="mt-2">
              DentraFlow acts solely as a technology service provider. DentraFlow does not provide medical services, clinical advice, diagnosis, or treatment.
            </p>
            <p className="mt-2">
              Each Clinic using a DentraFlow hosted page is independently owned and operated and is solely responsible for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>The accuracy of information displayed on its booking page</li>
              <li>Its services, providers, and treatment outcomes</li>
              <li>Patient communication beyond booking confirmation</li>
              <li>Refunds, cancellations, and rescheduling policies</li>
              <li>Compliance with applicable healthcare laws and regulations</li>
            </ul>
            <p className="mt-2">
              DentraFlow is not responsible for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Medical decisions or treatment provided by Clinics</li>
              <li>Disputes between patients and Clinics</li>
              <li>Clinical outcomes or service quality</li>
              <li>Any healthcare-related liability</li>
            </ul>
            <p className="mt-2">
              By using a hosted booking page, patients acknowledge that DentraFlow&apos;s role is limited to facilitating appointment scheduling on behalf of the Clinic.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. User Types</h2>
            <p className="mt-2">
              These Terms apply to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Clinics using DentraFlow (Business Users)</li>
              <li>Patients booking appointments through clinics using DentraFlow (End Users)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION A — FOR CLINICS</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Clinic Responsibilities</h2>
            <p className="mt-2">
              Clinics are solely responsible for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Medical care and treatment</li>
              <li>Appointment accuracy</li>
              <li>Cancellation and refund policies</li>
              <li>Compliance with local healthcare laws</li>
              <li>Compliance with HIPAA or other regulations where applicable</li>
            </ul>
            <p className="mt-4">
              DentraFlow does not supervise or control clinical services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Payments & Deposits</h2>
            <p className="mt-2">
              If a clinic enables deposit payments:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Payments are processed through third-party providers (e.g., PayPal).</li>
              <li>Funds are transferred directly to the clinic.</li>
              <li>DentraFlow does not hold patient funds.</li>
              <li>DentraFlow is not responsible for refunds.</li>
            </ul>
            <p className="mt-4">
              Clinics are solely responsible for handling:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Refund requests</li>
              <li>Chargebacks</li>
              <li>Payment disputes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Subscription Fees</h2>
            <p className="mt-2">
              Clinics agree to pay subscription fees according to their selected plan.
            </p>
            <p className="mt-2">
              Failure to pay may result in suspension or termination of service.
            </p>
            <p className="mt-2">
              All fees are non-refundable unless otherwise stated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Prohibited Use</h2>
            <p className="mt-2">Clinics may not:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Use the platform for unlawful purposes</li>
              <li>Misrepresent services</li>
              <li>Attempt to reverse engineer the platform</li>
              <li>Interfere with system security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. HIPAA &amp; Business Associate Agreement (For U.S. Clinics)</h2>
            <p className="mt-2">
              If a Clinic is subject to the Health Insurance Portability and Accountability Act of 1996 (HIPAA), DentraFlow
              may be considered a &quot;Business Associate&quot; as defined under HIPAA when processing Protected Health Information (PHI)
              on behalf of the Clinic.
            </p>
            <p className="mt-2">
              Where required by law, DentraFlow agrees to enter into a separate Business Associate Agreement (BAA) with the
              Clinic governing the use and protection of PHI.
            </p>
            <p className="mt-2">DentraFlow agrees to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Use PHI solely for the purpose of providing appointment scheduling and related services</li>
              <li>Not use or disclose PHI except as permitted by agreement or required by law</li>
              <li>Implement reasonable administrative, technical, and physical safeguards to protect PHI</li>
              <li>Report known breaches of unsecured PHI as required under applicable law</li>
            </ul>
            <p className="mt-2">The Clinic remains solely responsible for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Determining its HIPAA compliance obligations</li>
              <li>Ensuring appropriate patient disclosures</li>
              <li>Obtaining any necessary patient consents</li>
              <li>Complying with all federal and state healthcare regulations</li>
            </ul>
            <p className="mt-2">
              DentraFlow does not provide legal or compliance advice. Clinics are encouraged to consult their legal counsel
              regarding HIPAA requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">SECTION B — FOR PATIENTS</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Appointment Bookings</h2>
            <p className="mt-2">
              When booking through DentraFlow:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>You are booking directly with the dental clinic.</li>
              <li>The clinic is responsible for providing services.</li>
              <li>DentraFlow does not guarantee appointment availability.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">11. Deposits & Refunds</h2>
            <p className="mt-2">
              If a deposit is required:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Payment is made directly to the clinic.</li>
              <li>Refund eligibility is determined by the clinic&apos;s cancellation policy.</li>
              <li>DentraFlow does not control or guarantee refunds.</li>
            </ul>
            <p className="mt-4">
              Patients must contact the clinic directly for refund requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">12. No Medical Advice</h2>
            <p className="mt-2">
              Information provided through the AI chat system is for general informational purposes only.
            </p>
            <p className="mt-2">
              It does not constitute medical advice, diagnosis, or treatment.
            </p>
            <p className="mt-2">
              Always consult a licensed dental professional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">GENERAL TERMS (ALL USERS)</h2>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">13. Limitation of Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law:
            </p>
            <p className="mt-2">
              DentraFlow shall not be liable for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Medical treatment outcomes</li>
              <li>Clinic errors or negligence</li>
              <li>Refund disputes</li>
              <li>Missed appointments</li>
              <li>Indirect or consequential damages</li>
            </ul>
            <p className="mt-4">
              Total liability shall not exceed the amount paid to DentraFlow in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">14. Disclaimer of Warranties</h2>
            <p className="mt-2">
              The platform is provided &quot;as is&quot; and &quot;as available.&quot;
            </p>
            <p className="mt-2">We do not guarantee:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Uninterrupted service</li>
              <li>Error-free performance</li>
              <li>Specific financial results</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">15. Intellectual Property</h2>
            <p className="mt-2">
              All platform content, software, and branding are owned by DentraFlow.
            </p>
            <p className="mt-2">
              Users may not copy, modify, or distribute materials without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">16. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate accounts that:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Violate these Terms</li>
              <li>Engage in fraudulent activity</li>
              <li>Abuse the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">17. Data Protection</h2>
            <p className="mt-2">
              Use of the platform is also governed by our Privacy Policy and our <Link href="/dpa" className="font-medium text-primary underline hover:no-underline">Data Processing Agreement (DPA)</Link>, which describes how we process personal data on behalf of clinics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">18. Governing Law</h2>
            <p className="mt-2">
              These Terms shall be governed by the laws of:
            </p>
            <p className="mt-2 font-medium text-slate-800">
              United States, State of Delaware
            </p>
            <p className="mt-2">
              Disputes shall be resolved in the appropriate courts of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">19. Changes to Terms</h2>
            <p className="mt-2">
              We may update these Terms at any time.
            </p>
            <p className="mt-2">
              Continued use of the platform constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">20. Contact Information</h2>
            <p className="mt-4 font-medium text-slate-800">DentraFlow</p>
            <p className="mt-1">Email: support@dentraflow.com</p>
            <p className="mt-1">Website: https://www.dentraflow.com</p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
