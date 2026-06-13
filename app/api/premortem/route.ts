import { NextResponse } from "next/server";
import { analyzeProject, parseDepth } from "@/lib/analyze";
import { guard } from "@/lib/guard";
import { inc, log, observe } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = guard(req, "premortem");
  if (denied) return denied;

  const t0 = Date.now();
  inc("premortem_requests");
  try {
    const body = await req.json().catch(() => ({}));
    const description: string = (body?.description ?? "").toString();
    const depth = parseDepth(body?.depth);
    const lang = body?.lang === "en" ? "en" : "es";

    if (description.trim().length < 20) {
      inc("premortem_invalid");
      return NextResponse.json(
        { error: "Describe el proyecto con un poco más de detalle (mínimo ~20 caracteres)." },
        { status: 400 }
      );
    }
    if (description.length > 8000) {
      inc("premortem_invalid");
      return NextResponse.json(
        { error: "Descripción demasiado larga (máximo 8000 caracteres)." },
        { status: 400 }
      );
    }

    const { report, cached } = await analyzeProject(
      description,
      depth,
      body?.save !== false,
      new URL(req.url).origin,
      lang
    );

    const ms = Date.now() - t0;
    observe("premortem", ms);
    log("info", "pre-mortem generado", {
      id: report.id,
      ms,
      depth,
      cached,
      risks: report.risks.length,
      riskIndex: report.verdict.riskIndex,
      llm: report.generatedWith,
      retriever: report.retrieverUsed,
    });
    return NextResponse.json(report, { headers: { "X-Cache": cached ? "HIT" : "MISS" } });
  } catch (err: any) {
    inc("premortem_errors");
    log("error", "error generando pre-mortem", { err: err?.message });
    return NextResponse.json(
      { error: err?.message ?? "Error generando el pre-mortem." },
      { status: 500 }
    );
  }
}
