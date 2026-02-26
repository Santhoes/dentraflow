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
          Shipping & Delivery Policy
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
              DentraFlow is a software-as-a-service (SaaS) platform that provides AI-powered appointment booking and communication tools for dental clinics.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>We do not sell or ship physical products.</li>
              <li>All services are delivered digitally.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Digital Service Delivery</h2>
            <p className="mt-2">
              Upon successful subscription payment:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Clinic accounts are activated immediately or within a short processing period.</li>
              <li>Access credentials are delivered electronically via email.</li>
              <li>Platform access is provided through our web-based dashboard.</li>
              <li>No physical items are shipped.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Appointment Deposits</h2>
            <p className="mt-2">
              When patients pay appointment deposits through clinics using DentraFlow:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Payments are processed digitally through third-party payment providers.</li>
              <li>No physical goods are delivered.</li>
              <li>The payment confirms an appointment reservation with the dental clinic.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Service Availability</h2>
            <p className="mt-2">
              As a cloud-based software platform:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Services are accessible online.</li>
              <li>Access may be subject to maintenance, updates, or technical interruptions.</li>
              <li>DentraFlow does not guarantee uninterrupted access at all times.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. International Access</h2>
            <p className="mt-2">
              DentraFlow services are delivered electronically and are accessible internationally, subject to local internet availability and applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Contact Information</h2>
            <p className="mt-2">
              If you have questions regarding service access or account activation:
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
