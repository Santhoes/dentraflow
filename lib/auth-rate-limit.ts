import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

const LIMITS: Record<string, number> = {
  login: 15,
  signup: 5,
  set_password: 10,
};

function hashIp(ip: string): string {
  return createHash("sha256").update((ip || "unknown").trim()).digest("hex");
}

function getMinuteBucket(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "";
}

export async function checkAuthRateLimit(
  ip: string,
  kind: "login" | "signup" | "set_password"
): Promise<{ allowed: boolean }> {
  const limit = LIMITS[kind] ?? 10;
  const admin = createAdminClient();
  const ipHash = hashIp(ip);
  const bucket = getMinuteBucket();

  await admin
    .from("auth_ip_rate")
    .delete()
    .lt("bucket_minute", new Date(Date.now() - 2 * 60 * 1000).toISOString());

  const { data: row } = await admin
    .from("auth_ip_rate")
    .select("count")
    .eq("ip_hash", ipHash)
    .eq("bucket_minute", bucket)
    .eq("kind", kind)
    .maybeSingle();

  const count = (row as { count?: number } | null)?.count ?? 0;
  if (count >= limit) {
    return { allowed: false };
  }

  await admin.from("auth_ip_rate").upsert(
    {
      ip_hash: ipHash,
      bucket_minute: bucket,
      kind,
      count: count + 1,
    },
    { onConflict: "ip_hash,bucket_minute,kind" }
  );

  return { allowed: true };
}
