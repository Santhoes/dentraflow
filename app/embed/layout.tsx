import "./embed.css";

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full" style={{ minHeight: "320px" }}>
      {children}
    </div>
  );
}
