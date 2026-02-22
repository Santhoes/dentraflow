import { EmbedChatClient } from "@/components/embed/EmbedChatClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getParam(
  searchParams: { [key: string]: string | string[] | undefined } | null,
  key: string
): string | null {
  if (!searchParams || !(key in searchParams)) return null;
  const v = searchParams[key];
  if (v == null) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s.trim() || null : null;
}

export default function EmbedChatPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined } | null;
}) {
  const slug = getParam(searchParams, "clinic");
  const sig = getParam(searchParams, "sig");
  const locationId = getParam(searchParams, "location");
  const agentId = getParam(searchParams, "agent");

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        background: "white",
      }}
    >
      <EmbedChatClient
        slug={slug}
        sig={sig}
        locationId={locationId}
        agentId={agentId}
      />
    </div>
  );
}
