"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Support chat lives on the Chat page. Redirect so old links work. */
export default function AppSupportPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/chat");
  }, [router]);
  return null;
}
