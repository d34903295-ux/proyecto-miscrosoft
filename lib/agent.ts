// ─────────────────────────────────────────────────────────────
// Orquestación del agente Pre-Mortem Institucional.
//
// Razonamiento multi-paso:
//   1) Perfilar el proyecto nuevo (LLM o heurística).
//   2) Recuperar de la memoria los proyectos pasados más similares.
//   3) Deduplicar por categoría de fallo (no repetir el mismo modo de fallo).
//   4) Por cada caso: extraer el riesgo y MAPEARLO al proyecto actual,
//      anclado a la evidencia real del caso.
//   5) Anti-confirmación: un segundo razonamiento escéptico intenta REFUTAR
//      cada riesgo y recalibra su confianza.
//   6) Rankear por (relevancia × confianza calibrada × severidad histórica) y
//      reportar TODOS los casos inspeccionados (incluidos y descartados).
//   7) Autoevaluar: qué información falta en la descripción (preguntas) y en
//      qué dimensiones la memoria no tiene casos (puntos ciegos).
//
// Cada paso queda registrado en una traza auditable (qué decidió y cuánto tardó).
// No predice: recuerda. Cada riesgo nace de un registro pasado verificable.
// ─────────────────────────────────────────────────────────────

import type {
  DerivedRisk,
  InspectedCase,
  PreMortemReport,
  RetrievalHit,
  TraceStep,
  Verdict,
} from "./types";
import { getLLM } from "./llm";
import { getAllRecords, getRetriever } from "./retrieval";
import { tokenize } from "./textsim";
import { simulate } from "./simulation";
import { matchExternalFailures } from "./external";
import { detectGaps } from "./gaps";
import { findBlindSpots } from "./coverage";

const RETRIEVE_K = 10; // casos a inspeccionar antes de deduplicar
const MAX_RISKS = 6; // riesgos en el reporte final

export interface PreMortemOptions {
  retrieveK?: number;
  maxRisks?: number;
}

interface DedupeResult {
  kept: RetrievalHit[];
  /** id del hit descartado → la categoría y el id del hit que ya la cubría. */
  droppedByDedupe: Map<string, { category: string; coveredBy: string }>;
}

/** Deduplica por categoría de fallo, conservando el hit mejor rankeado, y
 *  registra qué se descartó por dedupe (para reportar el motivo REAL). */
function dedupeByCategory(hits: RetrievalHit[]): DedupeResult {
  const seen = new Map<string, RetrievalHit>();
  const kept: RetrievalHit[] = [];
  const droppedByDedupe = new Map<string, { category: string; coveredBy: string }>();
  for (const h of hits) {
    const cat = h.record.failureCategory;
    const cover = seen.get(cat);
    if (cover) {
      droppedByDedupe.set(h.record.id, { category: cat, coveredBy: cover.record.id });
      continue;
    }
    seen.set(cat, h);
    kept.push(h);
  }
  return { kept, droppedByDedupe };
}

export async function generatePreMortem(
  description: string,
  opts: PreMortemOptions = {}
): Promise<PreMortemReport> {
  const retrieveK = opts.retrieveK ?? RETRIEVE_K;
  const maxRisks = opts.maxRisks ?? MAX_RISKS;

  const llm = getLLM();
  const retriever = getRetriever();

  // Traza auditable: cada paso queda registrado con lo que decidió y cuánto tardó.
  const trace: TraceStep[] = [];
  let stepStart = Date.now();
  const mark = (name: string, detail: string) => {
    const now = Date.now();
    trace.push({ step: trace.length + 1, name, detail, ms: now - stepStart });
    stepStart = now;
  };

  // 1) Perfil del proyecto nuevo.
  const profile = await llm.extractProfile(description);
  mark(
    "perfilar",
    `cliente=${profile.clientType} · tech=[${profile.tech.join(", ")}] · apuesta=[${profile.marketBet.join(", ")}] · equipo=[${profile.teamDynamics.join(", ")}]`
  );

  // 2) Recuperar casos similares.
  const hits = await retriever.retrieve(profile, retrieveK);
  mark(
    "recuperar",
    `${hits.length} casos de la memoria «${retriever.name}» · top: ${hits
      .slice(0, 3)
      .map((h) => `${h.record.id} (${(h.score * 100).toFixed(0)}%)`)
      .join(", ")}`
  );

  // 3) Deduplicar por modo de fallo y limitar.
  const { kept, droppedByDedupe } = dedupeByCategory(hits);
  const candidates = kept.slice(0, maxRisks);
  mark(
    "deduplicar",
    `${hits.length} casos → ${candidates.length} candidatos (${droppedByDedupe.size} descartados por categoría repetida, ${Math.max(0, kept.length - maxRisks)} fuera del top ${maxRisks})`
  );

  // Términos DISTINTIVOS del proyecto (no la descripción entera, para no
  // marcar todo el vocabulario común), para resaltar en la cita qué disparó el match.
  const queryTokens = new Set(
    tokenize(
      [
        profile.keywords.join(" "),
        profile.tech.join(" "),
        profile.marketBet.join(" "),
        profile.teamDynamics.join(" "),
      ].join(" ")
    )
  );
  const matchedTermsFor = (extract: string): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const t of tokenize(extract)) {
      if (queryTokens.has(t) && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  };

  // 4 + 5) Derivar el riesgo y refutarlo (anti-confirmación), en paralelo.
  const derived = await Promise.all(
    candidates.map(async (hit): Promise<DerivedRisk> => {
      const core = await llm.deriveRisk({ profile, hit });
      const refutation = await llm.refuteRisk({ profile, hit, risk: core });
      const r = hit.record;
      const extract = hit.extracts[0]?.text ?? r.whatWentWrong;
      return {
        id: `risk-${r.id}`,
        rank: 0, // se asigna tras ordenar
        failureCategory: r.failureCategory,
        title: core.title,
        failureMode: core.failureMode,
        whyItAppliesHere: core.whyItAppliesHere,
        earlyWarningSignals: core.earlyWarningSignals,
        mitigation: core.mitigation,
        priorConfidence: core.confidence,
        // la confianza mostrada es la recalibrada por el contraanálisis.
        confidence: refutation.adjustedConfidence,
        refutation,
        evidence: {
          caseId: r.id,
          caseName: r.name,
          webUrl: hit.webUrl,
          extract,
          year: r.year,
          outcome: r.outcome,
          severity: r.severity,
          matchedDimensions: hit.matchedDimensions,
          retrievalScore: hit.score,
          matchedTerms: matchedTermsFor(extract),
        },
      };
    })
  );

  const moved = derived.filter(
    (r) => Math.round(r.priorConfidence * 100) !== Math.round(r.confidence * 100)
  );
  mark(
    "mapear+refutar",
    `${derived.length} riesgos derivados y contraanalizados · la refutación movió la confianza en ${moved.length}/${derived.length} (${derived
      .map((r) => `${Math.round(r.priorConfidence * 100)}→${Math.round(r.confidence * 100)}%`)
      .join(", ")})`
  );

  // 6) Rankear con la confianza CALIBRADA × relevancia × severidad histórica.
  derived.sort((a, b) => rankScore(b) - rankScore(a));
  derived.forEach((risk, i) => (risk.rank = i + 1));
  mark(
    "rankear",
    `orden final: ${derived.map((r) => `#${r.rank} ${r.evidence.caseId}`).join(" · ")}`
  );

  // Transparencia: todos los casos inspeccionados, incluidos y descartados.
  const inspected = buildInspected(hits, derived, maxRisks, droppedByDedupe);

  // 7) Conciencia de incertidumbre: qué falta en la descripción y dónde la
  //    memoria está ciega. El silencio no debe leerse como "no hay riesgo".
  const gaps = detectGaps(profile);
  const coverage = findBlindSpots(profile, getAllRecords());
  mark(
    "autoevaluar",
    `${gaps.length} preguntas pendientes · ${coverage.length} puntos ciegos de la memoria${
      coverage.length ? ` (${coverage.map((c) => c.value).join(", ")})` : ""
    }`
  );

  return {
    profile,
    verdict: buildVerdict(derived),
    risks: derived,
    simulation: simulate(derived),
    externalFailures: matchExternalFailures(profile, 3),
    inspected,
    trace,
    gaps,
    coverage,
    generatedWith: llm.name,
    retrieverUsed: retriever.name,
    casesInspected: hits.length,
    generatedAt: new Date().toISOString(),
  };
}

/** Etiqueta cada caso recuperado como incluido o descartado, con el motivo REAL
 *  (dedupe vs fuera-del-top), no inferido a posteriori. */
function buildInspected(
  hits: RetrievalHit[],
  risks: DerivedRisk[],
  maxRisks: number,
  droppedByDedupe: Map<string, { category: string; coveredBy: string }>
): InspectedCase[] {
  // evidence.caseId === record.id (ambos derivan del mismo record.id).
  const rankById = new Map(risks.map((r) => [r.evidence.caseId, r.rank]));
  return hits.map((h) => {
    const rank = rankById.get(h.record.id);
    const dropped = droppedByDedupe.get(h.record.id);
    let reason: string;
    if (rank !== undefined) {
      reason = `incluido → riesgo #${String(rank).padStart(2, "0")}`;
    } else if (dropped) {
      reason = `descartado · misma categoría («${dropped.category}») ya cubierta por ${dropped.coveredBy}`;
    } else {
      reason = `descartado · fuera del top ${maxRisks} por relevancia`;
    }
    return {
      caseId: h.record.id,
      caseName: h.record.name,
      year: h.record.year,
      failureCategory: h.record.failureCategory,
      score: h.score,
      matchedDimensions: h.matchedDimensions,
      webUrl: h.webUrl,
      included: rank !== undefined,
      reason,
    };
  });
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/**
 * Dictamen agregado, GROUNDED en los riesgos derivados (no inventa: el titular
 * nombra las categorías de fallo de los casos reales más parecidos).
 */
function buildVerdict(risks: DerivedRisk[]): Verdict {
  if (!risks.length) {
    return {
      riskIndex: 0,
      level: "bajo",
      headline:
        "No se encontraron proyectos suficientemente parecidos en la memoria de la empresa.",
      dominantThemes: [],
      topCases: [],
    };
  }

  const top = risks.slice(0, 3);
  const sevAvg = mean(top.map((r) => r.evidence.severity / 5));
  const confAvg = mean(top.map((r) => r.confidence));
  const relAvg = mean(top.map((r) => r.evidence.retrievalScore));
  const riskIndex = Math.round(100 * (0.5 * sevAvg + 0.3 * confAvg + 0.2 * relAvg));
  const level: Verdict["level"] = riskIndex >= 67 ? "alto" : riskIndex >= 34 ? "medio" : "bajo";

  const dominantThemes = Array.from(new Set(risks.map((r) => r.failureCategory))).slice(0, 3);
  const themesText =
    dominantThemes.length >= 2
      ? `${dominantThemes.slice(0, -1).join(", ")} y ${dominantThemes[dominantThemes.length - 1]}`
      : dominantThemes[0] ?? "";
  const headline = `Los proyectos más parecidos al tuyo fracasaron por ${themesText.toLowerCase()}.`;

  const topCases = top.map((r) => ({
    caseId: r.evidence.caseId,
    caseName: r.evidence.caseName,
    year: r.evidence.year,
  }));

  return { riskIndex, level, headline, dominantThemes, topCases };
}

function rankScore(risk: DerivedRisk): number {
  const relevance = risk.evidence.retrievalScore; // 0..1
  const confidence = risk.confidence; // 0..1
  const severity = risk.evidence.severity / 5; // 0..1
  return relevance * (0.5 + 0.5 * confidence) * (0.4 + 0.6 * severity);
}
