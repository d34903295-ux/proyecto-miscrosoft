// Health check para load balancers / probes de Kubernetes / App Service.
// Verifica las dependencias reales del proceso: memoria cargada y store escribible.

import { NextResponse } from "next/server";
import { memoryStats } from "@/lib/memorystore";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const stats = memoryStats();
    checks.memory = { ok: stats.total > 0, detail: `${stats.total} casos (${stats.custom} custom)` };
  } catch (err: any) {
    checks.memory = { ok: false, detail: err?.message };
  }

  try {
    const store = getStore();
    const probeId = "health-probe";
    store.put("health", probeId, { ts: Date.now() });
    store.delete("health", probeId);
    checks.store = { ok: true };
  } catch (err: any) {
    checks.store = { ok: false, detail: err?.message };
  }

  checks.config = {
    ok: true,
    detail: `llm=${process.env.LLM_PROVIDER ?? "stub"} retriever=${process.env.RETRIEVER ?? "synthetic"} auth=${process.env.API_KEY ? "api-key" : "abierta"}`,
  };

  const healthy = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", version: "1.1.0", checks },
    { status: healthy ? 200 : 503 }
  );
}
