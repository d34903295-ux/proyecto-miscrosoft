// Métricas de la instancia en formato de exposición Prometheus.
// Scrapeables por Prometheus / Azure Managed Grafana / cualquier agente.

import { renderMetrics } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(renderMetrics(), {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
