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
          className="mt-10 space-y-8 text-slate-600 break-words"
        >
          <section>
            <h2 className="text-xl font-semibold text-slate-900">How to cancel</h2>
            <p>
              You may cancel your DentraFlow subscription at any time. The easiest way is from your account: log in to the DentraFlow app, go to Plan & Billing (or Settings), and follow the option to cancel your subscription. You may also contact us via the Contact page or at support@dentraflow.com and request cancellation; we will process it and confirm by email.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">When it takes effect</h2>
            <p>
              Cancellation takes effect at the end of your current billing period. Until that date, you retain full access to the Service. You will not be charged for the next billing cycle. For example, if your billing date is the 15th of each month and you cancel on the 1st, you keep access until the 15th and are not charged again on the 15th.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">No cancellation fee</h2>
            <p>
              We do not charge cancellation fees. There is no penalty for canceling. You simply stop being charged from the next billing cycle onward. If you have already been charged for the current period, that charge is not reversed by cancellation; see our Refund Policy—refunds are only available if you cancel during the first 3-day free trial of your first month.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Data and export</h2>
            <p>
              Before your access ends, you may export or download data you need (e.g. appointment history, patient contact information) from the dashboard where available. After your subscription ends, we may retain data for a limited period for legal or operational reasons, but your access to the Service will cease. If you need help exporting data before closure, contact us and we will assist where reasonably possible.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Reactivation</h2>
            <p>
              If you change your mind after canceling, you can sign up again at any time. You may need to create a new account or re-subscribe depending on how long it has been. Any data we retained may not be restorable after the retention period; contact support to ask about reactivation and data recovery options.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
            <p>
              For cancellation requests or questions, use the Contact page on our website, the in-app support option, or email support@dentraflow.com.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
