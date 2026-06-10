// ─────────────────────────────────────────────────────────────
// Simulación "¿y si lo haces de todos modos?" — proyección a 5–10 años.
//
// No es adivinación: cada golpe en la línea temporal viene de un riesgo REAL
// derivado de un caso pasado. El modelo solo dispone esos golpes en el tiempo
// (cada modo de fallo tiende a manifestarse en una fase típica) y acumula su
// efecto. Dos escenarios: si IGNORAS las señales vs. si aplicas las mitigaciones.
// ─────────────────────────────────────────────────────────────

import type { DerivedRisk, SimEvent, SimPoint, Simulation } from "./types";

// Trimestre típico en que cada modo de fallo suele manifestarse.
const IMPACT_QUARTER: Record<string, number> = {
  "Time-to-market": 2,
  "Adopción/onboarding": 3,
  "UX/usabilidad": 4,
  "Integración legacy": 4,
  "Calidad de datos": 4,
  "Expectativas del cliente": 4,
  "Alcance/scope creep": 5,
  "Modelo de IA en producción": 5,
  "Pagos/conciliación": 5,
  "Coordinación multi-equipo": 5,
  "Performance/escala": 6,
  "Sobreingeniería": 6,
  Seguridad: 6,
  "Dependencia de proveedor": 7,
  "Dependencia de persona clave": 7,
  "Cumplimiento/regulación": 8,
  "Rotación/conocimiento": 8,
};

function impactQuarter(category: string): number {
  return IMPACT_QUARTER[category] ?? 6;
}

function whenLabel(q: number): string {
  const months = q * 3;
  if (months <= 0) return "inicio";
  if (months < 24) return `~Mes ${months}`;
  const years = months / 12;
  return `~Año ${Number.isInteger(years) ? years : years.toFixed(1)}`;
}

function gaussian(d: number, sd: number): number {
  return Math.exp(-(d * d) / (2 * sd * sd));
}

export function simulate(risks: DerivedRisk[], horizonQuarters = 40): Simulation {
  // Cada riesgo se convierte en un evento que golpea en su fase típica.
  const events: SimEvent[] = risks.map((r) => {
    const q = impactQuarter(r.failureCategory);
    const impact = (r.evidence.severity / 5) * r.confidence;
    return {
      q,
      whenLabel: whenLabel(q),
      title: r.title,
      failureCategory: r.failureCategory,
      caseName: r.evidence.caseName,
      caseId: r.evidence.caseId,
      webUrl: r.evidence.webUrl,
      severity: r.evidence.severity,
      impact: Number(impact.toFixed(3)),
    };
  });

  const SD = 2.2; // amplitud temporal del golpe (trimestres)
  const HSCALE = 0.16; // calibra la pendiente de la caída
  const MIT = 0.4; // mitigar reduce el hazard al 40%

  // hazard del trimestre t = suma de núcleos gaussianos centrados en cada evento.
  const hazardAt = (t: number, factor: number): number => {
    let h = 0;
    for (const e of events) h += e.impact * gaussian(t - e.q, SD);
    return Math.min(0.4, h * HSCALE * factor);
  };

  // tracción potencial: curva logística (crece y se estabiliza ~Año 3).
  const traction = (t: number): number => 100 / (1 + Math.exp(-(t - 7) / 3));

  const points: SimPoint[] = [];
  let sIgnore = 1; // supervivencia ignorando señales
  let sMit = 1; // supervivencia mitigando
  for (let t = 0; t <= horizonQuarters; t++) {
    if (t > 0) {
      sIgnore *= 1 - hazardAt(t, 1);
      sMit *= 1 - hazardAt(t, MIT);
    }
    const L = traction(t);
    points.push({
      q: t,
      survival: Number(sIgnore.toFixed(4)),
      ignore: Number((L * sIgnore).toFixed(2)),
      mitigate: Number((L * sMit).toFixed(2)),
    });
  }

  const at = (q: number): SimPoint => points[Math.min(q, points.length - 1)];
  const survival5y = at(20).survival;
  const survival10y = at(horizonQuarters).survival;

  const deadliest = events.length
    ? events.reduce((a, b) => (b.impact > a.impact ? b : a))
    : null;

  const pct = (x: number) => Math.round(x * 100);
  const summary = deadliest
    ? `Si lo haces de todos modos e ignoras las señales, la probabilidad de seguir vivo a 5 años es ~${pct(
        survival5y
      )}%. El punto de mayor peligro llega en ${deadliest.whenLabel}: ${deadliest.failureCategory.toLowerCase()}, como le pasó a «${deadliest.caseName}». Aplicar las mitigaciones cambia la trayectoria.`
    : "No hay riesgos suficientes para proyectar una trayectoria.";

  return {
    horizonQuarters,
    points,
    events,
    survival5y,
    survival10y,
    deadliest,
    summary,
  };
}
