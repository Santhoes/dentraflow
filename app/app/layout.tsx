"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppProvider, useApp } from "@/lib/app-context";
import {
  LayoutDashboard,
  Settings,
  Calendar,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  BarChart3,
  MapPin,
  MessageCircle,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { planAtLeast, normalizePlan } from "@/lib/plan-features";
import { PLANS } from "@/lib/supabase/types";
import type { PlanId } from "@/lib/supabase/types";

const NAV_ITEMS: { label: string; href: string; icon: typeof LayoutDashboard; minPlan?: PlanId }[] = [
  { label: "Overview", href: "/app", icon: LayoutDashboard },
  { label: "Settings", href: "/app/settings", icon: Settings },
  { label: "Appointments", href: "/app/appointments", icon: Calendar },
  { label: "Patients", href: "/app/patients", icon: Users },
  { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
  { label: "AI Agents", href: "/app/agents", icon: Bot },
  { label: "Clinics", href: "/app/locations", icon: MapPin },
  { label: "Chat", href: "/app/chat", icon: MessageCircle },
  { label: "Plan & Billing", href: "/app/plan", icon: CreditCard },
];

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clinic, loading } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [redirectChecked, setRedirectChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    setRedirectChecked(true);
  }, [loading, user, router]);

  useEffect(() => {
    if (!redirectChecked || loading || !user) return;
    if (clinic === null) {
      const t = setTimeout(() => {
        router.replace("/signup");
      }, 800);
      return () => clearTimeout(t);
    }
  }, [redirectChecked, loading, user, clinic, router]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const handleSignOut = async () => {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !clinic) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 lg:hidden"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/app" className="flex min-w-0 shrink-0 items-center gap-2 font-semibold text-slate-900 text-primary">
            <Image src="/logo.png" alt="DentraFlow" width={32} height={32} className="h-7 w-7 shrink-0 sm:h-8 sm:w-8 rounded-md object-contain" />
            <span className="truncate">DentraFlow</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden truncate max-w-[120px] text-sm text-slate-600 sm:inline">{clinic.name}</span>
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 sm:inline-block">
              {PLANS.find((p) => p.id === normalizePlan(clinic.plan))?.name ?? "Starter"}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 active:bg-slate-200"
            >
              <LogOut className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-56 border-r border-slate-200 bg-white pt-14 transition-transform duration-250 ease-out lg:static lg:translate-x-0 lg:transition-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav className="flex flex-col gap-1 p-4">
            {NAV_ITEMS.filter((item) => planAtLeast(clinic.plan, item.minPlan ?? "starter")).map((item) => {
              const isActive = pathname === item.href || (item.href !== "/app" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                    isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 animate-page-enter">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AppProvider>
  );
}
