import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const alt = "DentraFlow — AI Dental Receptionist. Fewer Empty Chairs. More Booked Appointments.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #BFDBFE 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 100,
            height: 100,
            background: "#1D4ED8",
            borderRadius: 20,
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            marginBottom: 32,
          }}
        >
          D
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: "#0f172a" }}>
          DentraFlow
        </div>
        <div style={{ fontSize: 28, color: "#1D4ED8", marginTop: 12 }}>
          AI Dental Receptionist
        </div>
        <div style={{ fontSize: 22, color: "#64748b", marginTop: 24 }}>
          Fewer Empty Chairs. More Booked Appointments.
        </div>
      </div>
    ),
    { ...size }
  );
}
