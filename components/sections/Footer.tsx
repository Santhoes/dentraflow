"use client";

import Link from "next/link";

const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund" },
  { label: "Cancellation Policy", href: "/cancellation" },
  { label: "Shipping Policy", href: "/shipping" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50/80 px-4 py-10 dark:border-slate-700 dark:bg-slate-800/80 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-2 lg:gap-x-12">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:gap-x-6">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-block min-h-[44px] py-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 touch-manipulation sm:py-0"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:gap-x-6">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-block min-h-[44px] py-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 touch-manipulation sm:py-0"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 sm:mt-10 lg:text-left">
          © {year} DentraFlow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
