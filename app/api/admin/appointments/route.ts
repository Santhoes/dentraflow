import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get("clinicId");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10)));
  const offset = (page - 1) * limit;

  const admin = createAdminClient();

  let query = admin
    .from("appointments")
    .select("id, clinic_id, patient_id, start_time, end_time, status, created_at", { count: "exact" });

  if (clinicId) query = query.eq("clinic_id", clinicId);
  if (fromParam) query = query.gte("start_time", fromParam);
  if (toParam) query = query.lte("start_time", toParam);

  const { data: appointments, error, count } = await query
    .order("start_time", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ appointments: [], byClinic: [], total: 0, page, limit });
    }
    console.error("admin appointments", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }

  const list = appointments || [];
  const clinicIds = Array.from(new Set(list.map((a) => (a as { clinic_id: string }).clinic_id)));
  const patientIds = Array.from(new Set(list.map((a) => (a as { patient_id: string }).patient_id).filter(Boolean)));

  const { data: clinics } = await admin.from("clinics").select("id, name");
  const clinicNames: Record<string, string> = {};
  for (const c of clinics || []) {
    clinicNames[(c as { id: string; name: string }).id] = (c as { id: string; name: string }).name;
  }

  let patientMap: Record<string, { full_name: string; email: string | null }> = {};
  if (patientIds.length > 0) {
    const { data: patients } = await admin.from("patients").select("id, full_name, email").in("id", patientIds);
    for (const p of patients || []) {
      const row = p as { id: string; full_name: string; email: string | null };
      patientMap[row.id] = { full_name: row.full_name, email: row.email };
    }
  }

  let byClinicQuery = admin.from("appointments").select("clinic_id");
  if (clinicId) byClinicQuery = byClinicQuery.eq("clinic_id", clinicId);
  if (fromParam) byClinicQuery = byClinicQuery.gte("start_time", fromParam);
  if (toParam) byClinicQuery = byClinicQuery.lte("start_time", toParam);
  const { data: allForCount } = await byClinicQuery.limit(2000);
  const byClinic: Record<string, number> = {};
  for (const a of allForCount || []) {
    const cid = (a as { clinic_id: string }).clinic_id;
    byClinic[cid] = (byClinic[cid] || 0) + 1;
  }
  const byClinicSummary = Object.entries(byClinic).map(([id, cnt]) => ({
    clinic_id: id,
    clinic_name: clinicNames[id] || id,
    count: cnt,
  }));

  const total = count ?? 0;
  return NextResponse.json({
    appointments: list.map((a) => {
      const row = a as { id: string; clinic_id: string; patient_id: string; start_time: string; end_time: string; status: string; created_at: string };
      const patient = row.patient_id ? patientMap[row.patient_id] : null;
      return {
        id: row.id,
        clinic_id: row.clinic_id,
        clinic_name: clinicNames[row.clinic_id],
        patient_name: patient?.full_name ?? null,
        patient_email: patient?.email ?? null,
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status,
        created_at: row.created_at,
      };
    }),
    byClinic: byClinicSummary,
    total,
    page,
    limit,
  });
}
