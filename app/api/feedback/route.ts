// Memoria evolutiva: el usuario marca si un riesgo predicho OCURRIÓ o no.
// Con eso el agente puede reportar su precisión histórica real — la memoria
// no solo recuerda el pasado: aprende de sus propios pre-mortems.

import { NextResponse } from "next/server";
import { guard, rateLimit } from "@/lib/guard";
import { inc, log } from "@/lib/logger";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FeedbackDoc {
  reportId: string;
  riskId: string;
  failureCategory: string;
  caseId: string;
  occurred: boolean;
  at: string;
}

/** Marca un riesgo: ocurrió / no ocurrió. Idempotente por (reportId, riskId). */
export async function POST(req: Request) {
  const denied = guard(req, "feedback");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const reportId = String(body?.reportId ?? "");
  const riskId = String(body?.riskId ?? "");
  const occurred = body?.occurred;

  if (!reportId || !riskId || typeof occurred !== "boolean") {
    return NextResponse.json(
      { error: "Requiere reportId, riskId y occurred (boolean)." },
      { status: 400 }
    );
  }

  // valida que el informe y el riesgo existan (el feedback se ancla a algo real)
  const report = getStore().get<any>("informes", reportId);
  if (!report) return NextResponse.json({ error: "Informe no encontrado." }, { status: 404 });
  const risk = (report.risks ?? []).find((r: any) => r.id === riskId);
  if (!risk) return NextResponse.json({ error: "Riesgo no encontrado en ese informe." }, { status: 404 });

  const doc: FeedbackDoc = {
    reportId,
    riskId,
    failureCategory: risk.failureCategory,
    caseId: risk.evidence.caseId,
    occurred,
    at: new Date().toISOString(),
  };
  const fid = `${reportId}--${riskId.replace(/[^a-zA-Z0-9_-]/g, "")}`.slice(0, 80);
  getStore().put("feedback", fid, doc);
  inc(occurred ? "feedback_hit" : "feedback_miss");
  log("info", "feedback de riesgo", { reportId, riskId, occurred });

  return NextResponse.json({ saved: fid, ...accuracy() });
}

/** Precisión histórica: % de riesgos marcados que sí ocurrieron. */
export async function GET(req: Request) {
  const denied = rateLimit(req, "feedback-stats");
  if (denied) return denied;
  return NextResponse.json(accuracy());
}

function accuracy() {
  const all = getStore().list<FeedbackDoc>("feedback", 1000);
  const evaluated = all.length;
  const hits = all.filter((e) => e.doc.occurred).length;
  return {
    evaluated,
    hits,
    accuracy: evaluated ? Number((hits / evaluated).toFixed(2)) : null,
  };
}
