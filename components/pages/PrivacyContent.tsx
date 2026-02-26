"use client";

import { motion } from "framer-motion";

export function PrivacyContent() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Privacy Policy
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
            <h2 className="text-xl font-semibold text-slate-900">1. Introduction</h2>
            <p className="mt-2">
              DentraFlow (&quot;DentraFlow&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides AI-powered appointment booking and communication software for dental clinics.
            </p>
            <p className="mt-2">
              This Privacy Policy explains how we collect, use, disclose, and protect personal information when:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Clinics use our SaaS platform</li>
              <li>Patients interact with booking systems powered by DentraFlow</li>
              <li>Users visit our website</li>
            </ul>
            <p className="mt-2">
              DentraFlow is a technology service provider and does not provide dental or medical services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Our Role</h2>
            <h3 className="mt-4 font-medium text-slate-800">For Clinics (Business Customers)</h3>
            <p className="mt-2">
              DentraFlow acts as a Data Controller for clinic account and subscription information.
            </p>
            <h3 className="mt-4 font-medium text-slate-800">For Patients Booking Appointments</h3>
            <p className="mt-2">
              DentraFlow acts as a Data Processor on behalf of the dental clinic.
            </p>
            <p className="mt-2">
              The dental clinic is the Data Controller responsible for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Patient care</li>
              <li>Medical decisions</li>
              <li>Treatment services</li>
              <li>Cancellation and refund policies</li>
            </ul>
            <p className="mt-4">
              Patients should contact the dental clinic directly for medical or treatment-related matters.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Hosted Booking Pages &amp; Data Processing</h2>
            <p className="mt-2">
              DentraFlow provides hosted booking pages under URLs such as:
            </p>
            <p className="mt-2 font-mono text-sm text-slate-700">
              dentraflow.com/&#123;clinic-name&#125;
            </p>
            <p className="mt-2">
              These pages are operated by DentraFlow on behalf of independent healthcare providers (&quot;Clinics&quot;)
              for the purpose of facilitating appointment scheduling and related communication.
            </p>
            <h3 className="mt-4 font-medium text-slate-800">Role of DentraFlow</h3>
            <p className="mt-2">
              When patients submit booking information through a DentraFlow-hosted page:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>The Clinic acts as the Data Controller, determining the purpose and use of patient information.</li>
              <li>DentraFlow acts as a Data Processor, processing booking information solely on behalf of the Clinic.</li>
              <li>
                DentraFlow does not provide medical services and does not use patient booking information for independent
                marketing purposes unless explicitly stated.
              </li>
            </ul>
            <h3 className="mt-4 font-medium text-slate-800">Information Collected</h3>
            <p className="mt-2">
              Through hosted booking pages, DentraFlow may collect:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Patient name</li>
              <li>Phone number</li>
              <li>Email address</li>
              <li>Appointment date and time preferences</li>
              <li>Basic booking details related to scheduling</li>
            </ul>
            <p className="mt-2">
              DentraFlow does not collect or store treatment notes, clinical records, or medical diagnoses unless explicitly
              agreed in writing.
            </p>
            <h3 className="mt-4 font-medium text-slate-800">How Information Is Used</h3>
            <p className="mt-2">
              Booking information collected via hosted pages is used solely to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Schedule appointments</li>
              <li>Send confirmations and reminders</li>
              <li>Enable rescheduling or cancellation via chat</li>
              <li>Provide booking analytics to the Clinic</li>
            </ul>
            <p className="mt-2">
              All booking data collected via hosted pages is shared with the selected Clinic.
            </p>
            <h3 className="mt-4 font-medium text-slate-800">Data Retention</h3>
            <p className="mt-2">
              DentraFlow retains booking data only as long as necessary to provide the service to the Clinic or as required
              by applicable law.
            </p>
            <p className="mt-2">
              Clinics are responsible for determining their own data retention policies once booking data is received.
            </p>
            <h3 className="mt-4 font-medium text-slate-800">International Users</h3>
            <p className="mt-2">
              DentraFlow may serve Clinics and patients located in multiple countries. Data may be processed in the United
              States or other jurisdictions where DentraFlow or its service providers operate, subject to appropriate
              safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Information We Collect</h2>
            <h3 className="mt-4 font-medium text-slate-800">A. Information from Clinics</h3>
            <p className="mt-2">
              When a clinic creates an account, we may collect:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Clinic name</li>
              <li>Business contact details</li>
              <li>Account login credentials</li>
              <li>Payment merchant identifiers (e.g., PayPal Merchant ID)</li>
              <li>Subscription billing details</li>
            </ul>
            <h3 className="mt-4 font-medium text-slate-800">B. Information from Patients</h3>
            <p className="mt-2">
              When a patient interacts with a DentraFlow-powered booking system, we may collect:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Appointment date and time</li>
              <li>Selected treatment category</li>
              <li>Messages submitted via chat</li>
              <li>Payment confirmation status</li>
            </ul>
            <p className="mt-4">
              DentraFlow does not store full credit card numbers or banking details.
            </p>
            <p className="mt-2">
              Payments are processed through third-party providers such as:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>PayPal</li>
            </ul>
            <h3 className="mt-4 font-medium text-slate-800">C. Automatically Collected Data</h3>
            <p className="mt-2">We may automatically collect:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device information</li>
              <li>Usage data</li>
              <li>Cookies and session identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. How We Use Information</h2>
            <p className="mt-2">We use personal information to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Provide and operate our platform</li>
              <li>Confirm and manage appointments</li>
              <li>Process deposits through third-party payment providers</li>
              <li>Send reminders and notifications</li>
              <li>Improve AI performance</li>
              <li>Maintain platform security</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-4 font-medium text-slate-800">We do not sell personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Legal Basis for Processing (GDPR – EU/UK Users)</h2>
            <p className="mt-2">
              For users in the European Union and United Kingdom, we process personal data under:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Contractual necessity</li>
              <li>Legitimate interests</li>
              <li>Legal obligations</li>
              <li>User consent (where required)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. California Privacy Rights (CCPA/CPRA)</h2>
            <p className="mt-2">
              If you are a California resident, you may have the right to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Request access to personal data we collect</li>
              <li>Request deletion of personal data</li>
              <li>Request disclosure of categories of data collected</li>
            </ul>
            <p className="mt-4 font-medium text-slate-800">DentraFlow does not sell personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. International Data Transfers</h2>
            <p className="mt-2">
              Because DentraFlow serves clinics globally, data may be processed outside your country of residence.
            </p>
            <p className="mt-2">We implement reasonable safeguards such as:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure cloud hosting</li>
              <li>Access control restrictions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Data Retention</h2>
            <p className="mt-2">
              We retain personal information only as long as necessary to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Provide our services</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce agreements</li>
            </ul>
            <p className="mt-4">
              Clinics control retention of appointment data within their accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Payment Processing</h2>
            <p className="mt-2">
              Appointment deposits are processed directly by third-party payment providers.
            </p>
            <p className="mt-2">DentraFlow:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Does not store full card details</li>
              <li>Does not act as a financial institution</li>
              <li>Is not responsible for clinic refund decisions</li>
            </ul>
            <p className="mt-4">
              Refunds and cancellations are governed by the dental clinic&apos;s policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">11. HIPAA Statement (United States)</h2>
            <p className="mt-2">
              DentraFlow provides scheduling and communication software only.
            </p>
            <p className="mt-2">
              We do not create, maintain, or store medical treatment records.
            </p>
            <p className="mt-2">
              Dental clinics are responsible for compliance with healthcare regulations, including HIPAA, where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">12. Security</h2>
            <p className="mt-2">
              We implement reasonable technical and organizational safeguards including:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Encrypted connections</li>
              <li>Secure hosting infrastructure</li>
              <li>Access controls</li>
              <li>Webhook verification for payments</li>
            </ul>
            <p className="mt-4">
              However, no system can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">13. Children&apos;s Privacy</h2>
            <p className="mt-2">
              DentraFlow is not directed to children under 13.
            </p>
            <p className="mt-2">
              Pediatric appointments must be scheduled by a parent or legal guardian.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">14. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time.
            </p>
            <p className="mt-2">
              Changes will be posted on this page with an updated effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">15. Contact Us</h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy, please contact:
            </p>
            <p className="mt-4 font-medium text-slate-800">DentraFlow</p>
            <p className="mt-1">Email: support@dentraflow.com</p>
            <p className="mt-1">Website: https://www.dentraflow.com</p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
