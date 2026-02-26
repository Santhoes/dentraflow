import "./embed.css";
import { EmbedBodyTransparent } from "./EmbedBodyTransparent";

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmbedBodyTransparent>
      <div
        className="min-h-0 w-full bg-transparent"
        style={{ background: "transparent", backgroundColor: "transparent" }}
      >
        {children}
      </div>
    </EmbedBodyTransparent>
  );
}
