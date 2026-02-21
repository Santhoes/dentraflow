import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export type GroupBy = "day" | "week" | "month" | "year";

function getStartDate(groupBy: GroupBy, end: Date): Date {
  const d = new Date(end);
  switch (groupBy) {
    case "day":
      d.setDate(d.getDate() - 60);
      break;
    case "week":
      d.setDate(d.getDate() - 52 * 7);
      break;
    case "month":
      d.setMonth(d.getMonth() - 24);
      break;
    case "year":
      d.setFullYear(d.getFullYear() - 5);
      break;
    default:
      d.setMonth(d.getMonth() - 3);
  }
  return d;
}

function formatPeriod(date: Date, groupBy: GroupBy): string {
  switch (groupBy) {
    case "day":
      return date.toISOString().slice(0, 10);
    case "week": {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    case "month":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    case "year":
      return String(date.getFullYear());
    default:
      return date.toISOString().slice(0, 10);
  }
}

export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const groupBy = (searchParams.get("groupBy") || "month") as GroupBy;

  const end = toParam ? new Date(toParam) : new Date();
  const start = fromParam ? new Date(fromParam) : getStartDate(groupBy, end);

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("appointments")
    .select("start_time");

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ data: [], total: 0 });
    }
    console.error("admin patients-booked", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }

  const list = rows || [];
  const buckets: Record<string, number> = {};

  for (const r of list) {
    const date = new Date((r as { start_time: string }).start_time);
    if (date < start || date > end) continue;
    let key: string;
    switch (groupBy) {
      case "day":
        key = date.toISOString().slice(0, 10);
        break;
      case "week": {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
        break;
      }
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
      case "year":
        key = String(date.getFullYear());
        break;
      default:
        key = date.toISOString().slice(0, 10);
    }
    buckets[key] = (buckets[key] || 0) + 1;
  }

  const result: { period: string; count: number }[] = [];
  const current = new Date(start);
  while (current <= end) {
    const key = formatPeriod(new Date(current), groupBy);
    result.push({ period: key, count: buckets[key] ?? 0 });
    switch (groupBy) {
      case "day":
        current.setDate(current.getDate() + 1);
        break;
      case "week":
        current.setDate(current.getDate() + 7);
        break;
      case "month":
        current.setMonth(current.getMonth() + 1);
        break;
      case "year":
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        current.setDate(current.getDate() + 1);
    }
  }

  const total = result.reduce((s, r) => s + r.count, 0);
  return NextResponse.json({ data: result, total });
}
