// ─────────────────────────────────────────────────────────────
// Honestidad epistémica: dónde la memoria está CIEGA.
//
// La regla del agente es "recuerda, no inventa". La consecuencia honesta:
// si la memoria no tiene casos parecidos en alguna dimensión del proyecto,
// el agente NO puede advertir nada ahí — y debe decirlo, en vez de dejar
// que el silencio se lea como "no hay riesgo". Este módulo cuenta, por cada
// dimensión detectada del proyecto, cuántos casos de la memoria la tocan,
// y reporta las que quedan sin respaldo.
// ─────────────────────────────────────────────────────────────

import type { CoverageGap, PastProjectRecord, ProjectProfile } from "./types";

/** Con menos de MIN_CASES casos, la dimensión se considera punto ciego. */
const MIN_CASES = 1;

export function findBlindSpots(
  profile: ProjectProfile,
  records: PastProjectRecord[]
): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  const count = (pred: (r: PastProjectRecord) => boolean) =>
    records.filter(pred).length;

  for (const t of profile.tech) {
    const n = count((r) => r.tech.includes(t));
    if (n < MIN_CASES) gaps.push({ dimension: "tech", value: t, casesInMemory: n });
  }
  for (const m of profile.marketBet) {
    const n = count((r) => r.marketBet === m);
    if (n < MIN_CASES) gaps.push({ dimension: "apuesta", value: m, casesInMemory: n });
  }
  for (const d of profile.teamDynamics) {
    const n = count((r) => r.teamDynamics === d);
    if (n < MIN_CASES) gaps.push({ dimension: "equipo", value: d, casesInMemory: n });
  }
  if (profile.clientType !== "desconocido") {
    const n = count((r) => r.clientType === profile.clientType);
    if (n < MIN_CASES)
      gaps.push({ dimension: "cliente", value: profile.clientType, casesInMemory: n });
  }

  return gaps;
}
