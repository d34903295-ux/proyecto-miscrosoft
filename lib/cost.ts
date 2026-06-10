// ─────────────────────────────────────────────────────────────
// Coste esperado: los CEOs entienden dinero, no porcentajes.
//
// Modelo ilustrativo y transparente: probabilidad = confianza calibrada del
// riesgo (tras la refutación); impacto = fracción del presupuesto base según
// la severidad HISTÓRICA del caso real. Pérdida esperada = p × impacto.
// El presupuesto es configurable (default $1M, el del consejo).
// ─────────────────────────────────────────────────────────────

import type { CostModel, DerivedRisk, RiskCost } from "./types";

/** Fracción del presupuesto que se pierde si el riesgo golpea (por severidad 1..5). */
const IMPACT_FRACTION = [0, 0.05, 0.12, 0.22, 0.38, 0.55];

export const DEFAULT_BUDGET = 1_000_000;

export function expectedCosts(risks: DerivedRisk[], budget = DEFAULT_BUDGET): CostModel {
  const perRisk: RiskCost[] = risks.map((r) => {
    const probability = r.confidence;
    const impact = Math.round(budget * IMPACT_FRACTION[r.evidence.severity]);
    return {
      rank: r.rank,
      title: r.title,
      failureCategory: r.failureCategory,
      probability,
      impact,
      expected: Math.round(probability * impact),
    };
  });
  return {
    budget,
    perRisk,
    totalExpected: perRisk.reduce((a, c) => a + c.expected, 0),
  };
}
