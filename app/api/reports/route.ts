// Historial de informes: lista resumida, más recientes primero.

import { NextResponse } from "next/server";
import type { PreMortemReport } from "@/lib/types";
import { getStore } from "@/lib/store";
import { rateLimit } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = rateLimit(req, "reports");
  if (denied) return denied;

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  const entries = getStore().list<PreMortemReport>("informes", limit);
  const reports = entries.map(({ id, doc }) => ({
    id,
    generatedAt: doc.generatedAt,
    summary: doc.profile.summary,
    riskIndex: doc.verdict.riskIndex,
    level: doc.verdict.level,
    headline: doc.verdict.headline,
    risks: doc.risks.length,
    generatedWith: doc.generatedWith,
    retrieverUsed: doc.retrieverUsed,
  }));
  return NextResponse.json({ reports });
}
