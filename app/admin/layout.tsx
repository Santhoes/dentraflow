"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin-auth";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Calendar,
  MessageSquare,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { label: "Dashboard & Analytics", href: "/admin", icon: LayoutDashboard },
  { label: "Clinics & Staff", href: "/admin/clinics", icon: Building2 },
  { label: "Billing", href: "/admin/billing", icon: CreditCard },
  { label: "Appointments", href: "/admin/appointments", icon: Calendar },
  { label: "Support", href: "/admin/support", icon: MessageSquare },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      if (!isAdminEmail(session.user.email)) {
        router.replace("/app");
        return;
      }
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 lg:hidden dark:hover:bg-slate-700 dark:active:bg-slate-600 touch-manipulation"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/admin" className="flex min-w-0 shrink-0 items-center gap-2 font-semibold text-slate-900 text-primary dark:text-primary-400">
            <Image src="/logo.png" alt="DentraFlow" width={32} height={32} className="h-7 w-7 shrink-0 sm:h-8 sm:w-8 rounded-md object-contain" />
            <span className="truncate">DentraFlow Admin</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 dark:active:bg-slate-600 touch-manipulation sm:min-w-0"
            >
              <LogOut className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white pt-14 transition-transform duration-250 ease-out dark:border-slate-700 dark:bg-slate-800 lg:top-14 lg:bottom-0 lg:translate-x-0 lg:transition-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav className="flex flex-col gap-1 p-4">
            {NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 touch-manipulation",
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:ml-64 lg:p-8 animate-page-enter">{children}</main>
      </div>
    </div>
  );
}
