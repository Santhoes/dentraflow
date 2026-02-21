"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Support lives at /app/support. Redirect so old links work. */
export default function AppChatPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/support");
  }, [router]);
  return null;
}
