// ─────────────────────────────────────────────────────────────
// Consejo de administración simulado (multiagente determinista).
//
// Pregunta: "Si tuvieras $1M para este proyecto, ¿invertirías?"
// Cuatro perspectivas votan, cada una mirando SOLO los riesgos de su área
// (mismos datos, lentes distintas — por eso pueden discrepar), y el consejo
// agrega la decisión. Cada argumento cita el caso real que lo motiva:
// la regla "recuerda, no inventa" también aplica al directorio.
// ─────────────────────────────────────────────────────────────

import type { BoardDecision, BoardVote, DerivedRisk } from "./types";

const PORTFOLIOS: Record<BoardVote["role"], { label: string; categories: string[] }> = {
  CTO: {
    label: "tecnología",
    categories: [
      "Integración legacy", "Performance/escala", "Seguridad",
      "Modelo de IA en producción", "Sobreingeniería", "Calidad de datos",
      "Dependencia de proveedor",
    ],
  },
  CFO: {
    label: "finanzas y riesgo",
    categories: ["Pagos/conciliación", "Cumplimiento/regulación", "Time-to-market", "Alcance/scope creep"],
  },
  CMO: {
    label: "mercado y adopción",
    categories: ["Adopción/onboarding", "Expectativas del cliente", "UX/usabilidad"],
  },
  COO: {
    label: "operación y equipo",
    categories: [
      "Coordinación multi-equipo", "Rotación/conocimiento",
      "Dependencia de persona clave", "Alcance/scope creep", "Time-to-market",
    ],
  },
};

function shortName(name: string): string {
  return name.split("—")[0].trim();
}

/** Severidad×confianza promedio de los riesgos del área → exposición 0..1. */
function exposure(risks: DerivedRisk[]): number {
  if (!risks.length) return 0;
  const xs = risks.map((r) => (r.evidence.severity / 5) * r.confidence);
  return Math.max(...xs) * 0.6 + (xs.reduce((a, b) => a + b, 0) / xs.length) * 0.4;
}

function voteFor(role: BoardVote["role"], all: DerivedRisk[], riskIndex: number): BoardVote {
  const { label, categories } = PORTFOLIOS[role];
  const mine = all.filter((r) => categories.includes(r.failureCategory));
  const exp = exposure(mine);
  const top = mine[0];

  let vote: BoardVote["vote"];
  let argument: string;
  // umbrales deterministas: exposición alta = no; media = condicionado; baja = sí.
  if (!top) {
    vote = riskIndex >= 67 ? "condicionado" : "sí";
    argument = `Desde ${label} no veo casos pasados parecidos que me frenen. Mi única condición es el cuadro general (índice ${riskIndex}/100): que las otras áreas respondan sus riesgos.`;
  } else if (exp >= 0.55) {
    vote = "no";
    argument = `En ${label}, este proyecto repite el patrón de «${shortName(top.evidence.caseName)}» (${top.evidence.year}): ${top.failureCategory.toLowerCase()}, severidad ${top.evidence.severity}/5. Aquel terminó así: ${top.evidence.outcome} No invierto hasta ver resuelta su mitigación.`;
  } else if (exp >= 0.3) {
    vote = "condicionado";
    argument = `Invertiría con UNA condición de ${label}: ${top.mitigation} Lo digo porque «${shortName(top.evidence.caseName)}» ignoró exactamente eso y lo pagó.`;
  } else {
    vote = "sí";
    argument = `Los riesgos de ${label} existen (${top.failureCategory.toLowerCase()}, como en «${shortName(top.evidence.caseName)}») pero el contraanálisis los deja como hipótesis vigilables, no bloqueantes. Invierto, con las señales tempranas en el tablero.`;
  }

  return {
    role,
    roleLabel: label,
    vote,
    confidence: Number(Math.min(0.95, Math.max(0.35, top ? 0.45 + exp * 0.5 : 0.6)).toFixed(2)),
    argument,
    riskRefs: mine.slice(0, 2).map((r) => ({ rank: r.rank, title: r.title, caseId: r.evidence.caseId })),
  };
}

export function deliberate(risks: DerivedRisk[], riskIndex: number): BoardDecision {
  const votes = (["CTO", "CFO", "CMO", "COO"] as const).map((role) =>
    voteFor(role, risks, riskIndex)
  );
  const noes = votes.filter((v) => v.vote === "no").length;
  const sies = votes.filter((v) => v.vote === "sí").length;

  let invest: BoardDecision["invest"];
  let reason: string;
  if (noes >= 2) {
    invest = "no";
    reason = `${noes} de 4 direcciones ven patrones de fracaso directos en la memoria. El consejo no compromete el millón hasta un replanteo: resolver primero las mitigaciones del top de riesgos.`;
  } else if (sies >= 3 && riskIndex < 67) {
    invest = "sí";
    reason = `Mayoría del consejo a favor: los parecidos con fracasos pasados son vigilables, no bloqueantes. Se invierte con las señales tempranas como tablero de control.`;
  } else if (sies >= 3) {
    // coherencia con el dictamen: con índice de riesgo ALTO no hay "sí" pleno
    invest = "condicionado";
    reason = `Las direcciones votan a favor por separado, pero el índice agregado (${riskIndex}/100, alto) obliga al consejo a invertir POR TRAMOS: el cuadro completo pesa más que cada área aislada.`;
  } else {
    invest = "condicionado";
    reason = `El consejo invierte POR TRAMOS: el primer desembolso queda condicionado a cumplir las mitigaciones que cada dirección puso sobre la mesa, con revisión en el punto de no retorno.`;
  }

  const confidence = Number(
    (votes.reduce((a, v) => a + v.confidence, 0) / votes.length).toFixed(2)
  );
  return { invest, confidence, reason, votes };
}
