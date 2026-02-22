"use client";

import { motion } from "framer-motion";

export function ShippingContent() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Shipping Policy
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
            <h2 className="text-xl font-semibold text-slate-900">Digital service only</h2>
            <p>
              DentraFlow is a software-as-a-service (SaaS) product. We do not sell or ship any physical goods. There are no shipping fees, delivery addresses, or physical delivery times. This policy explains how and when you receive access to our digital Service.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">When you get access</h2>
            <p>
              &quot;Delivery&quot; of the Service means your access to the DentraFlow platform. Access begins once you have created an account and completed the signup process. If your plan requires payment, access is activated once your first payment has been successfully processed. You can then log in to the app, configure your clinic and AI agents, and use the chat widget and other features immediately. There is no waiting period for digital delivery—access is effective as soon as your account and payment (if applicable) are in place.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">How the service is delivered</h2>
            <p>
              The Service is delivered over the internet. You access it through a web browser and, where applicable, by embedding our chat widget on your website. No software is shipped to you; everything runs in the cloud. You are responsible for having a compatible device and internet connection. The Service is generally available 24/7, subject to our uptime and maintenance practices.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Geographic availability</h2>
            <p>
              DentraFlow is available in the regions where we offer the Service from our website. If you are in a supported region and have completed signup and payment (if required), you have the same access as other customers. We do not guarantee availability in every country; restrictions may apply based on payment methods, regulations, or operational decisions. If you have questions about availability in your area, contact us via the Contact page.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
            <p>
              For questions about this Shipping Policy or about when your access begins, contact us via the Contact page or at support@dentraflow.com.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
