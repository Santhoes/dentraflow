"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Briefings are now on the Appointments page. Redirect so old links work. */
export default function BriefingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/appointments");
  }, [router]);
  return null;
}
