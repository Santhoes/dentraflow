import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClinicSignature } from "@/lib/chat-signature";
import { getNextSlots, getSlotsForDate, getNextDaysWithSlots } from "@/lib/embed-slots";

/**
 * GET /api/embed/slots?clinicSlug=...&sig=...&location=...&agent=...
 * Optional: date=YYYY-MM-DD — return slots for that day only. Otherwise returns next 5 slots.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clinicSlug = searchParams.get("clinicSlug")?.trim();
  const sig = searchParams.get("sig")?.trim();
  const locationId = searchParams.get("location")?.trim() || null;
  const agentId = searchParams.get("agent")?.trim() || null;
  const dateParam = searchParams.get("date")?.trim() || null;

  if (!clinicSlug || !sig || !verifyClinicSignature(clinicSlug, sig)) {
    return NextResponse.json({ error: "Invalid or missing signature" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data: clinic, error: clinicErr } = await supabase
    .from("clinics")
    .select("id, working_hours, timezone")
    .eq("slug", clinicSlug)
    .maybeSingle();

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  let workingHours = clinic.working_hours as Record<string, { open: string; close: string }> | null;
  let effectiveLocationId: string | null = locationId;

  if (agentId) {
    const { data: agent } = await supabase
      .from("ai_agents")
      .select("location_id")
      .eq("id", agentId)
      .eq("clinic_id", clinic.id)
      .maybeSingle();
    if (agent && (agent as { location_id?: string | null }).location_id) {
      effectiveLocationId = (agent as { location_id: string }).location_id;
    }
  }

  if (effectiveLocationId) {
    const { data: loc } = await supabase
      .from("clinic_locations")
      .select("working_hours")
      .eq("id", effectiveLocationId)
      .eq("clinic_id", clinic.id)
      .maybeSingle();
    if (loc?.working_hours) {
      workingHours = loc.working_hours as Record<string, { open: string; close: string }>;
    }
  }

  const clinicId = (clinic as { id: string }).id;
  const timezone = (clinic as { timezone?: string }).timezone?.trim() || "America/New_York";

  const fromDate = new Date();
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 14);
  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time")
    .eq("clinic_id", clinicId)
    .in("status", ["pending", "scheduled", "confirmed"])
    .gte("start_time", fromDate.toISOString())
    .lte("start_time", toDate.toISOString());

  const existingStarts = (appointments || []).map(
    (a: { start_time: string }) => (a as { start_time: string }).start_time
  );

  const modeDays = searchParams.get("days") === "1";
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateParam || "");
  let slots: { label: string; start: string; end: string }[] = [];
  let hasSlotsToday = false;
  let workingDays: { dateStr: string; label: string }[] = [];

  if (modeDays) {
    workingDays = getNextDaysWithSlots(workingHours, timezone, existingStarts, 5);
    const body = { workingDays, slots: [] as typeof slots };
    return NextResponse.json(body);
  }

  if (isDateOnly) {
    slots = getSlotsForDate(workingHours, timezone, dateParam!, existingStarts, 24, true).map((s) => ({
      label: s.label,
      start: s.start,
      end: s.end,
    }));
  } else {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
    const todaySlots = getSlotsForDate(workingHours, timezone, todayStr, existingStarts, 1);
    hasSlotsToday = todaySlots.length > 0;
    const nextSlots = getNextSlots(workingHours, timezone, existingStarts, 12);
    slots = nextSlots.map((s) => ({ label: s.label, start: s.start, end: s.end }));
  }

  const body: { slots: typeof slots; hasSlotsToday?: boolean; workingDays?: typeof workingDays } = {
    slots,
  };
  if (!isDateOnly) body.hasSlotsToday = hasSlotsToday;
  return NextResponse.json(body);
}
