import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugFromName } from "@/lib/supabase/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, clinicName, country, timezone, whatsapp_phone, workingHours } = body as {
      plan: string;
      clinicName: string;
      country: string;
      timezone?: string;
      whatsapp_phone?: string;
      workingHours?: Record<string, { open: string; close: string }> | null;
    };
    if (!plan || !clinicName || !country) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!whatsapp_phone?.trim()) {
      return NextResponse.json({ error: "WhatsApp number is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const admin = createAdminClient();
    const slug = slugFromName(clinicName);
    const slugExists = await admin.from("clinics").select("id").eq("slug", slug).maybeSingle();
    const finalSlug = slugExists.data?.id ? `${slug}-${Date.now().toString(36)}` : slug;

    const { data: clinic, error: clinicError } = await admin.from("clinics").insert({
      name: clinicName,
      slug: finalSlug,
      country,
      timezone: timezone || "America/New_York",
      plan,
      whatsapp_phone: whatsapp_phone.trim(),
      working_hours: workingHours || null,
    }).select("id").single();

    if (clinicError || !clinic) {
      console.error("clinic insert", clinicError);
      return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 });
    }

    const { error: memberError } = await admin.from("clinic_members").insert({
      clinic_id: clinic.id,
      user_id: user.id,
      role: "owner",
    });
    if (memberError) {
      console.error("clinic_member insert", memberError);
      return NextResponse.json({ error: "Failed to add you to clinic" }, { status: 500 });
    }

    return NextResponse.json({ success: true, clinicId: clinic.id, slug: finalSlug });
  } catch (e) {
    console.error("create-clinic-free", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
