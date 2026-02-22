import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

const RATE_LIMIT_PER_MINUTE = 5;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip.trim() || "unknown").digest("hex");
}

function getMinuteBucket(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

export async function checkContactRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const supabase = createAdminClient();
  const ipHash = hashIp(ip);
  const bucket = getMinuteBucket();

  await supabase
    .from("contact_form_ip_rate")
    .delete()
    .lt("bucket_minute", new Date(Date.now() - 2 * 60 * 1000).toISOString());

  const { data: row } = await supabase
    .from("contact_form_ip_rate")
    .select("count")
    .eq("ip_hash", ipHash)
    .eq("bucket_minute", bucket)
    .maybeSingle();

  const count = (row as { count?: number } | null)?.count ?? 0;
  if (count >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false };
  }

  await supabase.from("contact_form_ip_rate").upsert(
    {
      ip_hash: ipHash,
      bucket_minute: bucket,
      count: count + 1,
    },
    { onConflict: "ip_hash,bucket_minute" }
  );

  return { allowed: true };
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
