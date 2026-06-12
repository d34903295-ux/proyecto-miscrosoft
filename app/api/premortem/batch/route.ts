// Análisis de PORTAFOLIO: varios proyectos en una llamada, en paralelo,
// rankeados por índice de riesgo. Cada uno queda persistido con permalink.
// Caso de uso: triage de iniciativas antes de asignar presupuesto.

import { NextResponse } from "next/server";
import { analyzeProject, parseDepth } from "@/lib/analyze";
import { guard } from "@/lib/guard";
import { inc, log, observe } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROJECTS = 10;

export async function POST(req: Request) {
  const denied = guard(req, "premortem-batch");
  if (denied) return denied;

  const t0 = Date.now();
  inc("batch_requests");
  try {
    const body = await req.json().catch(() => ({}));
    const depth = parseDepth(body?.depth);
    const save = body?.save !== false;
    const raw: any[] = Array.isArray(body?.projects) ? body.projects : [];

    const projects = raw
      .map((p, i) => ({
        name: (p?.name ?? `Proyecto ${i + 1}`).toString().slice(0, 120),
        description: (p?.description ?? "").toString(),
      }))
      .filter((p) => p.description.trim().length >= 20);

    if (projects.length === 0) {
      return NextResponse.json(
        { error: "Envía projects: [{name?, description}] — cada descripción con al menos ~20 caracteres." },
        { status: 400 }
      );
    }
    if (projects.length > MAX_PROJECTS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_PROJECTS} proyectos por lote.` },
        { status: 400 }
      );
    }

    const origin = new URL(req.url).origin;
    const results = await Promise.all(
      projects.map(async (p) => {
        const { report, cached } = await analyzeProject(p.description, depth, save, origin);
        return { name: p.name, report, cached };
      })
    );

    // ranking: más riesgoso primero
    results.sort((a, b) => b.report.verdict.riskIndex - a.report.verdict.riskIndex);

    const ranking = results.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      id: r.report.id ?? null,
      riskIndex: r.report.verdict.riskIndex,
      // probabilidad de éxito RELATIVA (modo VC): complemento del índice,
      // útil para ordenar inversión — no es una predicción absoluta.
      successProb: Math.max(5, 100 - r.report.verdict.riskIndex),
      level: r.report.verdict.level,
      headline: r.report.verdict.headline,
      dominantThemes: r.report.verdict.dominantThemes,
      topCase: r.report.risks[0]
        ? {
            caseId: r.report.risks[0].evidence.caseId,
            caseName: r.report.risks[0].evidence.caseName,
          }
        : null,
      risks: r.report.risks.length,
      gaps: r.report.gaps.length,
      cached: r.cached,
    }));

    const ms = Date.now() - t0;
    observe("batch", ms);
    log("info", "portafolio analizado", { proyectos: projects.length, ms, depth });
    return NextResponse.json({ depth, analyzed: projects.length, ranking });
  } catch (err: any) {
    inc("batch_errors");
    log("error", "error en batch", { err: err?.message });
    return NextResponse.json({ error: err?.message ?? "Error analizando el lote." }, { status: 500 });
  }
}
