"use client";

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
          className="prose prose-slate mt-10 max-w-none space-y-8 text-slate-600 prose-p:leading-relaxed break-words"
        >
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Agreement to terms</h2>
            <p>
              By accessing or using DentraFlow (&quot;Service&quot;), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Service. These terms apply to the software-as-a-service platform we provide to dental and other healthcare practices for AI-powered reception, appointment booking, reminders, and related features.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Eligibility</h2>
            <p>
              The Service is intended for use by dental clinics, practices, and related businesses. You must be at least 18 years old and have the authority to bind your organization to these Terms. You represent that the information you provide when registering is accurate and that you will use the Service only for lawful clinical and business purposes in compliance with applicable laws, including those governing healthcare data and patient communications.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Account and security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must notify us promptly of any unauthorized access or use. We are not liable for any loss or damage arising from your failure to protect your account.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Description of service</h2>
            <p>
              DentraFlow is a subscription-based SaaS platform that provides an AI receptionist, embeddable chat widget, appointment booking and management, automated reminders (email and, on certain plans, WhatsApp), multi-location dashboards, and staff briefings. The Service is delivered online; there are no physical goods. Features and availability may vary by plan. We reserve the right to modify, suspend, or discontinue features with reasonable notice where practicable.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Subscription, billing, and payment</h2>
            <p>
              Subscription fees are billed in advance (e.g. monthly or as specified in your plan). You must provide valid payment information. By subscribing, you authorize us to charge your chosen payment method. Prices and plans are as displayed at signup and on our pricing page; we may change fees with advance notice for subsequent billing periods. You may cancel or change your plan in accordance with our Cancellation and Refund policies. Failure to pay may result in suspension or termination of access.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Acceptable use</h2>
            <p>
              You may use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service to violate any law, infringe others&apos; rights, send spam or malicious content, attempt to gain unauthorized access to our or third-party systems, or use the Service in a way that could harm, overload, or impair it. You are responsible for ensuring that your use of the Service (including AI-generated communications and patient data) complies with applicable healthcare and data-protection regulations.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Intellectual property</h2>
            <p>
              DentraFlow and its content, features, and functionality (including but not limited to software, design, text, and branding) are owned by us or our licensors and are protected by copyright, trademark, and other intellectual property laws. We grant you a limited, non-exclusive, non-transferable license to access and use the Service for your internal business use during your subscription. You may not copy, modify, distribute, or create derivative works from our Service or content except as expressly permitted.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Disclaimers</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available.&quot; We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components. We disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. The AI and automated features are tools to assist your practice; you remain responsible for clinical decisions and patient care.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, DentraFlow and its affiliates, officers, and employees shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising out of or related to your use or inability to use the Service. Our total liability for any claims arising from or related to these Terms or the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim. Some jurisdictions do not allow the exclusion or limitation of certain damages; in such jurisdictions, our liability will be limited to the greatest extent permitted by law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Indemnity</h2>
            <p>
              You agree to indemnify, defend, and hold harmless DentraFlow and its affiliates and their respective officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising out of or related to your use of the Service, your violation of these Terms, or your violation of any third-party rights or applicable law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">11. Termination and effect of cancellation</h2>
            <p>
              You may cancel your subscription at any time as set out in our Cancellation Policy. We may suspend or terminate your access if you breach these Terms or for other reasons (e.g. non-payment) with notice where reasonable. Upon termination, your right to use the Service ceases. We may retain data in accordance with our Privacy Policy and applicable law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">12. Governing law and jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which DentraFlow operates, without regard to conflict-of-law principles. Any dispute arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts in that jurisdiction, except where prohibited by law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">13. Changes to terms</h2>
            <p>
              We may update these Terms from time to time. We will post the revised Terms on this page and update the &quot;Last updated&quot; date. Material changes may be communicated by email or in-app notice. Continued use of the Service after the effective date of changes constitutes acceptance of the revised Terms. If you do not agree, you must stop using the Service and cancel your subscription.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">14. Contact</h2>
            <p>
              For questions about these Terms, contact us via the Contact page on our website or at the email address provided there (e.g. support@dentraflow.com).
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
