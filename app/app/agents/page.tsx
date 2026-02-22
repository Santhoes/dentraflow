"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route: AI Agents has been replaced by Team (staff accounts).
 * Redirect to Team so old links and bookmarks still work.
 */
export default function AppAgentsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/team");
  }, [router]);
  return null;
}
