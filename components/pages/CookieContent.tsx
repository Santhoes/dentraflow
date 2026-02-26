"use client";

import { motion } from "framer-motion";

export function CookieContent() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          🍪 Cookie Policy
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
              This Cookie Policy explains how DentraFlow (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) uses cookies and similar technologies when you visit our website or use our platform.
            </p>
            <p className="mt-2">
              By using our website, you consent to the use of cookies in accordance with this policy, unless you disable them through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. What Are Cookies?</h2>
            <p className="mt-2">
              Cookies are small text files stored on your device when you visit a website. They help improve functionality, security, and user experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Types of Cookies We Use</h2>
            <h3 className="mt-4 font-medium text-slate-800">A. Essential Cookies</h3>
            <p className="mt-2">
              These cookies are necessary for the platform to function properly.
            </p>
            <p className="mt-2">Examples:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Login authentication</li>
              <li>Session management</li>
              <li>Security protection</li>
            </ul>
            <p className="mt-4">
              Without these cookies, the service cannot operate correctly.
            </p>
            <h3 className="mt-4 font-medium text-slate-800">B. Performance & Analytics Cookies</h3>
            <p className="mt-2">
              We may use analytics tools to understand:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>How users interact with our website</li>
              <li>Which pages are visited</li>
              <li>Usage patterns</li>
            </ul>
            <p className="mt-4">
              This helps us improve performance and user experience.
            </p>
            <h3 className="mt-4 font-medium text-slate-800">C. Functional Cookies</h3>
            <p className="mt-2">
              These remember user preferences such as:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Language selection</li>
              <li>Login state</li>
              <li>Account settings</li>
            </ul>
            <h3 className="mt-4 font-medium text-slate-800">D. Third-Party Cookies</h3>
            <p className="mt-2">
              Some cookies may be placed by third-party services such as:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Payment providers (e.g., PayPal)</li>
              <li>Analytics providers</li>
              <li>Hosting providers</li>
            </ul>
            <p className="mt-4">
              We do not control third-party cookies directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. How to Manage Cookies</h2>
            <p className="mt-2">
              You may control cookies through:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Your browser settings</li>
              <li>Deleting stored cookies</li>
              <li>Blocking certain cookie categories</li>
            </ul>
            <p className="mt-4">
              Note: Disabling essential cookies may impact platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. EU & UK Users (GDPR Compliance)</h2>
            <p className="mt-2">
              For users located in the European Union or United Kingdom:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Non-essential cookies may require your consent.</li>
              <li>You may withdraw consent at any time.</li>
              <li>We recommend implementing a cookie consent banner for EU visitors.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Cookie Policy periodically.
            </p>
            <p className="mt-2">
              Changes will be posted with an updated effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Contact Us</h2>
            <p className="mt-4 font-medium text-slate-800">DentraFlow</p>
            <p className="mt-1">Email: support@dentraflow.com</p>
            <p className="mt-1">Website: https://www.dentraflow.com</p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
