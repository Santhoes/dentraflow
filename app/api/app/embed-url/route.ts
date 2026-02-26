import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContextFromRequest } from "@/lib/auth/app-auth";
import { signClinicSlug } from "@/lib/chat-signature";

/**
 * Returns signed embed URL and iframe snippet for the clinic. Requires auth + clinic membership.
 * Auth: cookie or Authorization: Bearer <session_token>
 */
export async function GET(request: Request) {
  const ctx = await getAuthContextFromRequest(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("app_user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!member?.clinic_id) {
    return NextResponse.json({ error: "No clinic" }, { status: 403 });
  }
  const clinicId = (member as { clinic_id: string }).clinic_id;
  const { data: clinic } = await admin
    .from("clinics")
    .select("slug")
    .eq("id", clinicId)
    .single();
  if (!clinic?.slug) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }
  if (clinic.slug.toLowerCase() === "demo") {
    return NextResponse.json(
      {
        error:
          "The slug 'demo' is reserved and cannot be used for the chat widget. Please contact support to update your clinic slug to a unique value (e.g. based on your clinic name).",
        code: "DEMO_SLUG_RESERVED",
      },
      { status: 400 }
    );
  }
  const sig = signClinicSlug(clinic.slug);
  if (!sig) {
    return NextResponse.json(
      { error: "Chat widget is not configured. Set CHAT_PROTECTION_SECRET in your server environment." },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location")?.trim() || null;
  const agentId = searchParams.get("agent")?.trim() || null;

  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://www.dentraflow.com").replace(/\/$/, "");
  let embedUrl = `${base}/embed/chat?clinic=${encodeURIComponent(clinic.slug)}&sig=${sig}`;
  if (agentId) {
    const { data: agent } = await admin
      .from("ai_agents")
      .select("id")
      .eq("id", agentId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (agent) embedUrl += `&agent=${encodeURIComponent(agentId)}`;
  }
  if (locationId && !agentId) {
    const { data: loc } = await admin
      .from("clinic_locations")
      .select("id")
      .eq("id", locationId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (loc) embedUrl += `&location=${encodeURIComponent(locationId)}`;
  }
  // Toggle button: chat icon when closed, close (X) when open. Chat visible on load.
  const iframeSnippet = `<!-- DentraFlow Chat Widget -->
<div id="dentraflow-chat-root" style="position:fixed;bottom:20px;right:20px;z-index:99999;font-family:system-ui,sans-serif;">
  <button type="button" id="dentraflow-toggle" style="width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;cursor:pointer;box-shadow:0 6px 18px rgba(29,78,216,0.35);display:flex;align-items:center;justify-content:center;">
    <span id="dentraflow-icon-close" style="display:flex;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></span>
    <span id="dentraflow-icon-chat" style="display:none;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
  </button>
  <iframe id="dentraflow-chat-iframe" src="${embedUrl}" title="Chat with us" style="position:absolute;bottom:70px;right:0;width:min(360px,95vw);height:min(480px,80vh);border:none;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.18);display:block;background:transparent;"></iframe>
</div>
<script>
(function(){
  var toggleBtn=document.getElementById("dentraflow-toggle");
  var iframe=document.getElementById("dentraflow-chat-iframe");
  var iconClose=document.getElementById("dentraflow-icon-close");
  var iconChat=document.getElementById("dentraflow-icon-chat");
  function openChat(){if(iframe){iframe.style.display="block";}if(iconClose){iconClose.style.display="flex";}if(iconChat){iconChat.style.display="none";}}
  function closeChat(){if(iframe){iframe.style.display="none";}if(iconClose){iconClose.style.display="none";}if(iconChat){iconChat.style.display="flex";}}
  toggleBtn.addEventListener("click",function(){if(iframe.style.display==="none"||iframe.style.display===""){openChat();}else{closeChat();}});
  window.addEventListener("message",function(e){if(e.data&&e.data.type==="dentraflow-minimize"){closeChat();}});
})();
</script>`;
  return NextResponse.json({
    embedUrl,
    iframeSnippet,
    clinicSlug: clinic.slug,
    locationId: locationId || null,
    agentId: agentId || null,
  });
}
