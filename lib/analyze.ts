// ─────────────────────────────────────────────────────────────
// Punto único de análisis para los endpoints (single y batch):
// profundidad configurable + caché LRU + persistencia + webhook.
// ─────────────────────────────────────────────────────────────

import type { PreMortemReport } from "./types";
import { generatePreMortem } from "./agent";
import { cacheGet, cacheKey, cachePut } from "./cache";
import { getStore, newId } from "./store";
import { log } from "./logger";
import { notifyReport } from "./webhook";

/** Profundidades de análisis expuestas en API y UI. */
export const DEPTHS = {
  rapido: { retrieveK: 6, maxRisks: 3 },
  estandar: { retrieveK: 10, maxRisks: 6 },
  profundo: { retrieveK: 16, maxRisks: 10 },
} as const;

export type Depth = keyof typeof DEPTHS;

export function parseDepth(v: unknown): Depth {
  return typeof v === "string" && v in DEPTHS ? (v as Depth) : "estandar";
}

export interface AnalyzeResult {
  report: PreMortemReport;
  cached: boolean;
}

/**
 * Analiza un proyecto con caché y persistencia. Un hit de caché devuelve el
 * MISMO reporte (incluido su id/permalink si se guardó): mismo análisis,
 * cero cómputo repetido.
 */
export async function analyzeProject(
  description: string,
  depth: Depth,
  save: boolean,
  baseUrl?: string
): Promise<AnalyzeResult> {
  const key = cacheKey(description, depth);
  const hit = cacheGet(key);
  if (hit && (!save || hit.id)) return { report: hit, cached: true };

  const report = await generatePreMortem(description, DEPTHS[depth]);

  if (save) {
    report.id = newId();
    try {
      getStore().put("informes", report.id, report);
      notifyReport(report, baseUrl);
    } catch (err: any) {
      log("warn", "no se pudo persistir el informe", { err: err?.message });
      report.id = undefined;
    }
  }

  cachePut(key, report);
  return { report, cached: false };
}
