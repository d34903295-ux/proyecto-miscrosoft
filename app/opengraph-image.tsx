// Tarjeta social (og:image) generada en runtime con next/og — misma identidad
// Terminal Forense. Aparece al compartir el link en Teams/Slack/X/WhatsApp.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Pre-Mortem Institucional — no predice: recuerda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          backgroundColor: "#0b0b0d",
          borderTop: "6px solid #f2b01e",
          color: "#e9e6df",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", color: "#f2b01e", fontSize: 26, letterSpacing: 6 }}>
          {"// PRE-MORTEM / INSTITUCIONAL"}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 110,
            fontWeight: 700,
            lineHeight: 1.02,
            marginTop: 28,
          }}
        >
          <span>No se predice.</span>
          <span style={{ color: "#86837c" }}>Se recuerda.</span>
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 30, color: "#b7b3aa" }}>
          Cada riesgo de tu proyecto, anclado a un caso real que puedes abrir.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 44,
            fontSize: 22,
            color: "#86837c",
            letterSpacing: 3,
          }}
        >
          MICROSOFT AGENTS LEAGUE · TRACK REASONING AGENTS · EVAL 8/8
        </div>
      </div>
    ),
    size
  );
}
