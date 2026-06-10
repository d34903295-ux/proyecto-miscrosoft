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

/** Convierte "~Mes 9" / "~Año 2" a un mes/año calendario desde la fecha base. */
function calendarLabel(whenLabel: string, baseYear: number): string {
  const m = whenLabel.match(/Mes (\d+)/);
  const y = whenLabel.match(/Año ([\d.]+)/);
  const months = m ? Number(m[1]) : y ? Math.round(Number(y[1]) * 12) : 12;
  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  // mes 0 = junio del año base (estable: deriva del reporte, no del reloj)
  const idx = (5 + months) % 12;
  const year = baseYear + Math.floor((5 + months) / 12);
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
  const killer = risks.find((r) => r.evidence.caseId === sim.deadliest!.caseId) ?? risks[0];
  const second = risks.find((r) => r.rank !== killer.rank);
  const signal = killer.evidence ? killer.earlyWarningSignals[0] : undefined;
  const deathDate = calendarLabel(sim.deadliest.whenLabel, baseYear);
  const endYear = baseYear + Math.round(sim.horizonQuarters / 8); // mitad del horizonte
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
