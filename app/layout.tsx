import type { Metadata } from "next";
import "./globals.css";
import { SmoothScroll } from "@/components/motion";
import Atmosphere from "@/components/Atmosphere";
import CommandPalette from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: "PRE-MORTEM / INSTITUCIONAL",
  description:
    "No se predice. Se recuerda. Cada riesgo de tu proyecto, anclado a un caso real de la memoria de la empresa.",
  applicationName: "Pre-Mortem Institucional",
  openGraph: {
    title: "Pre-Mortem Institucional — no predice: recuerda",
    description:
      "Agente de razonamiento para Microsoft Agents League: convierte la memoria institucional en advertencias accionables, cada riesgo anclado a un caso real verificable.",
    type: "website",
    locale: "es",
  },
};

export const viewport = {
  themeColor: "#0b0b0d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Fuentes cargadas en runtime por el navegador (no en build, para no
            depender de la red al compilar). Space Mono = voz protagonista;
            IBM Plex Sans = prosa larga. Si fallan, el CSS cae a mono del SO. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Atmosphere />
        <SmoothScroll>{children}</SmoothScroll>
        <CommandPalette />
      </body>
    </html>
  );
}
