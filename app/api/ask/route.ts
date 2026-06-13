// "Interrogá la evidencia": Q&A GROUNDED sobre un caso de la memoria.
// Responde solo desde el expediente (regla recuerda-no-inventa). Razona con el
// modelo de Microsoft Foundry configurado (o extractivo determinista sin modelo).

import { NextResponse } from "next/server";
import { getRecordById } from "@/lib/retrieval";
import { answerFromCase } from "@/lib/chat";
import { guard } from "@/lib/guard";
import { inc, log, observe } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = guard(req, "ask");
  if (denied) return denied;

  const t0 = Date.now();
  inc("ask_requests");
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = String(body?.caseId ?? "");
    const question = String(body?.question ?? "").trim();

    if (question.length < 3) {
      return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
    }
    const record = getRecordById(caseId);
    if (!record) {
      return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });
    }

    const result = await answerFromCase(record, question);
    observe("ask", Date.now() - t0);
    log("info", "interrogación de evidencia", {
      caseId,
      provider: result.provider,
      grounded: result.grounded,
      ms: Date.now() - t0,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    inc("ask_errors");
    log("error", "error en /api/ask", { err: err?.message });
    return NextResponse.json({ error: err?.message ?? "Error respondiendo." }, { status: 500 });
  }
}
