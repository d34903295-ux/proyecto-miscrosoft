import type { MetadataRoute } from "next";

// PWA: instalable en el teléfono ("Agregar a pantalla de inicio").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pre-Mortem Institucional",
    short_name: "Pre-Mortem",
    description:
      "No se predice. Se recuerda. Cada riesgo de tu proyecto, anclado a un caso real.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
