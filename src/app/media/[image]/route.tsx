import { ImageResponse } from "next/og";
import { SEARCH_PAGES, imageId } from "@/lib/search-pages";
import { SITE } from "@/lib/site";

export async function GET(_request: Request, { params }: { params: Promise<{ image: string }> }) {
  const { image } = await params;
  const page = SEARCH_PAGES.find((candidate) => `${imageId(candidate)}.png` === image);
  if (!page) return new Response("Image not found", { status: 404 });
  return new ImageResponse(
    <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#f7f5ef", color: "#0b1020", padding: "48px 58px", flexDirection: "column", border: "12px solid #0b1020" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="8" width="52" height="52" rx="15" fill="#0b1020" />
          <rect x="4" y="4" width="52" height="52" rx="15" fill="#ffd23f" stroke="#0b1020" strokeWidth="3" />
          <path d="M15 16h-4v32h4M49 16h4v32h-4" stroke="#0b1020" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 19v26M32 19v26M43 19v26M19 23h26M19 32h26M19 41h26" stroke="#0b1020" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M21 23l22 18M43 23 21 41" stroke="#ff6b4a" strokeWidth="4" strokeLinecap="round" />
          <circle cx="28" cy="31" r="1.6" fill="#0b1020" /><circle cx="36" cy="31" r="1.6" fill="#0b1020" />
          <path d="M29 37q3 2.5 6 0" stroke="#0b1020" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="46" cy="45" r="4.2" fill="#5b8cff" stroke="#0b1020" strokeWidth="2" />
        </svg>
        <span style={{ fontSize: 32, fontWeight: 700 }}>{SITE.name}</span>
        <span style={{ fontSize: 18, marginLeft: "auto", color: "#475569" }}>{page.kind === "article" ? "WORKED EXAMPLE" : "CALCULATE · CONVERT · EXPLORE"}</span>
      </div>
      <div style={{ display: "flex", marginTop: 42, fontSize: page.title.length > 65 ? 47 : 54, fontWeight: 700, lineHeight: 1.13, maxWidth: 1040 }}>{page.title}</div>
      <div style={{ display: "flex", marginTop: 27, padding: "18px 22px", fontSize: 27, lineHeight: 1.3, background: "#fffdf5", border: "2px solid #0b1020", borderRadius: 16 }}>
        {page.formula ?? "Prepare your inputs. Confirm when you are ready."}
      </div>
      <div style={{ display: "flex", marginTop: "auto", alignItems: "center", gap: 10 }}>
        <span style={{ background: "#ff6b4a", width: 16, height: 16, borderRadius: 5, border: "2px solid #0b1020" }} />
        <span style={{ background: "#5b8cff", width: 16, height: 16, borderRadius: 5, border: "2px solid #0b1020" }} />
        <span style={{ fontSize: 19, color: "#475569", marginLeft: 8 }}>{page.path}</span>
        <span style={{ fontSize: 18, color: "#475569", marginLeft: "auto" }}>No account required</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
