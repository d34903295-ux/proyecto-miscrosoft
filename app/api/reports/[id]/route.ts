// Un informe persistido, completo, por id.

import { NextResponse } from "next/server";
import type { PreMortemReport } from "@/lib/types";
import { getStore } from "@/lib/store";
import { rateLimit, requireApiKey } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = rateLimit(req, "report");
  if (denied) return denied;

  let report: PreMortemReport | null = null;
  try {
    report = getStore().get<PreMortemReport>("informes", params.id);
  } catch {
    // id con formato inválido → mismo 404 (sin filtrar detalles internos)
  }
  if (!report) return NextResponse.json({ error: "Informe no encontrado." }, { status: 404 });
  return NextResponse.json({ ...report, id: params.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const denied = requireApiKey(req, "report-delete") ?? rateLimit(req, "report-delete");
  if (denied) return denied;

  let ok = false;
  try {
    ok = getStore().delete("informes", params.id);
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: "Informe no encontrado." }, { status: 404 });
  return NextResponse.json({ deleted: params.id });
}
