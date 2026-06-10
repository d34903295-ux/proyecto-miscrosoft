// ─────────────────────────────────────────────────────────────
// "Muéstrame mi funeral" — el obituario del proyecto.
//
// Narrativa retrospectiva escrita desde el futuro, compuesta SOLO con los
// riesgos derivados, sus casos reales, las señales ignoradas y la línea
// temporal de la simulación. Determinista: mismo análisis, mismo funeral.
// ─────────────────────────────────────────────────────────────

import type { DerivedRisk, Simulation } from "./types";

function shortName(name: string): string {
  return name.split("—")[0].trim();
}

/** "~Mes 9" / "~Año 2" → meses desde la fecha del reporte. */
function monthsFrom(whenLabel: string): number {
  const m = whenLabel.match(/Mes (\d+)/);
  const y = whenLabel.match(/Año ([\d.]+)/);
  return m ? Number(m[1]) : y ? Math.round(Number(y[1]) * 12) : 12;
}

/** Mes/año calendario contando desde la fecha REAL del reporte (generatedAt). */
function calendarLabel(whenLabel: string, baseYear: number, baseMonth: number): string {
  const months = monthsFrom(whenLabel);
  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const idx = (baseMonth + months) % 12;
  const year = baseYear + Math.floor((baseMonth + months) / 12);
  return `${MESES[idx]} de ${year}`;
}

export function writeFuneral(
  risks: DerivedRisk[],
  sim: Simulation,
  generatedAt: string
): string {
  if (!risks.length || !sim.deadliest) {
    return "No hay funeral que narrar: la memoria no encontró parecidos suficientes. Eso no es inmortalidad — es un punto ciego.";
  }

  const baseYear = Number(generatedAt.slice(0, 4)) || 2026;
  const baseMonth = Math.max(0, (Number(generatedAt.slice(5, 7)) || 1) - 1);
  const killer = risks.find((r) => r.evidence.caseId === sim.deadliest!.caseId) ?? risks[0];
  const second = risks.find((r) => r.rank !== killer.rank);
  const signal = killer.evidence ? killer.earlyWarningSignals[0] : undefined;
  const deathDate = calendarLabel(sim.deadliest.whenLabel, baseYear, baseMonth);
  // el cierre llega ~1 año después del golpe más letal (coherente con la línea temporal)
  const endYear =
    baseYear + Math.floor((baseMonth + monthsFrom(sim.deadliest.whenLabel)) / 12) + 1;
  const survivalPct = Math.round(sim.survival5y * 100);

  const lines: string[] = [];
  lines.push(
    `Año ${endYear}. El proyecto cerró. La causa oficial fue "${killer.failureCategory.toLowerCase()}"; la causa real fue no recordar a «${shortName(killer.evidence.caseName)}» (${killer.evidence.year}), que murió de lo mismo.`
  );
  if (signal) {
    lines.push(
      `La primera señal apareció cerca de ${deathDate}: "${signal.toLowerCase()}". Se anotó, se pospuso, se olvidó — igual que entonces.`
    );
  }
  if (second) {
    lines.push(
      `Para cuando el equipo reaccionó, el segundo frente ya estaba abierto: ${second.failureCategory.toLowerCase()}, el mismo patrón de «${shortName(second.evidence.caseName)}». ${second.evidence.outcome}`
    );
  }
  lines.push(
    `El modelo le daba a esta trayectoria un ${survivalPct}% de probabilidad de llegar viva a los 5 años ignorando las señales. No era mala suerte: estaba escrito en la memoria de la empresa.`
  );
  lines.push(
    `Epitafio: ${killer.mitigation}`
  );
  lines.push(`— Este funeral es evitable. Por eso existe este reporte.`);
  return lines.join("\n\n");
}
