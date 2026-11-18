import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen que aparece al compartir el sitio por WhatsApp, Facebook, X, etc. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: "linear-gradient(135deg,#0D1513 0%,#0E3B33 100%)", color: "#F4F7F5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, background: "#2FBF9B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54, fontWeight: 800, color: "#0D1513" }}>S</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#2FBF9B" }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>Lo que pasa en Sampacho, ahora.</div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 34, color: "#B9C7C1" }}>Novedades, comercios, oficios y servicios del pueblo</div>
      </div>
    ),
    size,
  );
}
