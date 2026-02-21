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
            <h2 className="text-xl font-semibold text-slate-900">Eligibility</h2>
            <p>
              Refunds are only available if you cancel during the free trial—the first 3 days of your first month. If you cancel at any time after the free trial, no refund will be given for current or past billing periods. You may cancel whenever you want; refunds are limited to cancellations within that initial 3-day trial. To be eligible for a refund, you must contact us within the free-trial window and provide your account email and a brief reason for the request. We do not offer refunds for subsequent months or for charges after the first month except where required by law (e.g. in certain jurisdictions).
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">How to request</h2>
            <p>
              To request a refund, contact us via the Contact page on our website or at support@dentraflow.com. Include your account email (the one used to sign up) and, if you wish, a short reason. We will verify your account and confirm whether your cancellation fell within the first 3-day free trial of your first month; only then is a refund issued.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Processing</h2>
            <p>
              We will process eligible refund requests within 5–10 business days. Refunds are issued to the original payment method used for the charge. Depending on your bank or card issuer, it may take additional time for the refund to appear on your statement. We will email you once the refund has been processed.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Free trial only</h2>
            <p>
              The free trial is the first 3 days of your first month. If you cancel during that period and have been charged, we will refund that charge. If you cancel during the free trial and were never charged, there is nothing to refund. We do not offer refunds for cancellations after the 3-day trial, for plan upgrades or downgrades that have already taken effect, or for any charges after the first month, except where local law requires otherwise.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Exclusions</h2>
            <p>
              There is no 30-day or general refund period. Refunds are only for cancellations during the first 3 days (free trial) of the first month. After that, you can still cancel at any time, but no refund will be issued for the current or any previous billing period.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
            <p>
              For questions about your subscription or refund eligibility, contact our support team via the Contact page or at support@dentraflow.com.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
