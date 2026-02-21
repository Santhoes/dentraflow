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
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 text-slate-500"
        >
          Last updated: February 2025
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 space-y-8 text-slate-600"
        >
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Data controller and contact</h2>
            <p>
              DentraFlow (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is the data controller for the personal data we collect and process in connection with our Service. For privacy-related questions, requests, or complaints, contact us via the Contact page on our website or at support@dentraflow.com.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Information we collect</h2>
            <p>
              We collect: (a) <strong>Account and profile data</strong> — email, password (hashed), name, and other details you provide when signing up or managing your account; (b) <strong>Practice and clinic data</strong> — clinic name, locations, contact details, working hours, branding, and configuration you set in the Service; (c) <strong>Patient data</strong> — when you use the Service to book or manage appointments, we process patient names, contact information, and appointment details that you or the AI collect and store through the platform (you act as data controller for patient data; we process it on your behalf as a service provider); (d) <strong>Usage and logs</strong> — how you use the Service, chat and booking interactions (for service delivery and improvement), IP address, and similar technical data; (e) <strong>Communication data</strong> — messages you send to us (e.g. support or contact form) and communications we send to you (e.g. appointment reminders, transactional emails).
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Legal basis</h2>
            <p>
              We process your data on the following bases: (a) <strong>Contract</strong> — to provide the Service, manage your subscription, and communicate with you about your account; (b) <strong>Legitimate interests</strong> — to improve the Service, ensure security, and send relevant product updates; (c) <strong>Consent</strong> — where we ask for your consent (e.g. marketing emails), you may withdraw it at any time; (d) <strong>Legal obligation</strong> — where we must retain or disclose data to comply with law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. How we use the information</h2>
            <p>
              We use the information to: deliver and operate the Service (including AI chat, booking, reminders, and dashboards); authenticate and manage your account; send transactional and service-related emails (e.g. appointment confirmations, reminders); provide support and respond to your requests; improve our products and develop new features; ensure security and prevent abuse; and comply with legal obligations. We do not sell your personal information to third parties.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Retention</h2>
            <p>
              We retain your data for as long as your account is active and as needed to provide the Service. After you cancel, we may retain certain data for a limited period for legal, security, or operational reasons (e.g. backups, dispute resolution). Patient and appointment data may be retained in accordance with your instructions and applicable healthcare or data-retention requirements. You may request deletion of your personal data subject to our legal and operational constraints.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Sharing and subprocessors</h2>
            <p>
              We share data only as necessary to operate the Service and as described here. We use trusted subprocessors, including: <strong>Supabase</strong> (database and backend); <strong>Resend</strong> (email delivery); <strong>OpenAI</strong> (AI for the chat widget); <strong>Twilio</strong> (WhatsApp and SMS where applicable); and <strong>PayPal</strong> (payment processing). These providers are bound by contracts that require them to protect your data. We may also disclose data if required by law or to protect our rights, safety, or property.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. International transfers</h2>
            <p>
              Your data may be processed in countries other than your own, including the United States and other jurisdictions where our subprocessors operate. We ensure appropriate safeguards (e.g. standard contractual clauses or adequacy decisions) where required by applicable data protection laws.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Your rights</h2>
            <p>
              Depending on your location, you may have the right to: <strong>Access</strong> — obtain a copy of your personal data; <strong>Rectification</strong> — correct inaccurate data; <strong>Erasure</strong> — request deletion of your data; <strong>Portability</strong> — receive your data in a structured, machine-readable format; <strong>Object or restrict</strong> — object to certain processing or request restriction; <strong>Withdraw consent</strong> — where processing is based on consent; <strong>Complain</strong> — lodge a complaint with a supervisory authority. To exercise these rights, contact us via the Contact page. We will respond within the timeframes required by applicable law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Cookies and similar technologies</h2>
            <p>
              We use cookies and similar technologies (e.g. local storage) to provide the Service, keep you logged in, remember preferences, and analyze usage. Essential cookies are necessary for the Service to function; you may be able to disable or limit non-essential cookies via your browser settings. Our website may use analytics to understand how visitors use our marketing pages; this is subject to our cookie practices and your choices where applicable.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction. This includes encryption in transit and at rest, access controls, and secure development practices. You are responsible for keeping your account credentials secure. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">11. Children</h2>
            <p>
              The Service is not directed at individuals under 18. We do not knowingly collect personal data from children. If you believe we have collected data from a child, please contact us and we will take steps to delete it.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">12. Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the &quot;Last updated&quot; date. Material changes may be communicated by email or in-app notice. We encourage you to review this policy periodically. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">13. Contact</h2>
            <p>
              For privacy-related questions, requests, or complaints, contact us via the Contact page on our website or at support@dentraflow.com.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
