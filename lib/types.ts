// ─────────────────────────────────────────────────────────────
// Tipos centrales del Pre-Mortem Institucional.
// ─────────────────────────────────────────────────────────────

export type ClientType =
  | "enterprise"
  | "startup"
  | "gobierno"
  | "consumer"
  | "pyme"
  | "interno"
  | "desconocido";

/** Un registro de proyecto pasado en la memoria de la empresa. */
export interface PastProjectRecord {
  id: string;
  name: string;
  year: number;
  clientType: ClientType;
  /** Tecnologías / naturaleza técnica (etiquetas). */
  tech: string[];
  /** Apuesta / supuesto de mercado (etiqueta). */
  marketBet: string;
  /** Dinámica de equipo (etiqueta). */
  teamDynamics: string;
  description: string;
  /** La apuesta o supuesto central del proyecto. */
  assumption: string;
  /** Qué salió mal. */
  whatWentWrong: string;
  /** Señales que se ignoraron en su momento. */
  ignoredSignals: string[];
  outcome: string;
  /** 1 (leve) … 5 (catastrófico). */
  severity: number;
  /** Categoría del modo de fallo (para deduplicar riesgos). */
  failureCategory: string;
  /** Lo que se debió hacer — base de la mitigación sugerida. */
  mitigation: string;
}

/** Perfil estructurado del proyecto NUEVO que el usuario describe. */
export interface ProjectProfile {
  raw: string;
  summary: string;
  clientType: ClientType;
  tech: string[];
  marketBet: string[];
  teamDynamics: string[];
  keywords: string[];
}

/** Fragmento relevante de un hit — espejo de `extracts[]` del Copilot Retrieval API. */
export interface RetrievalExtract {
  text: string;
  /** Copilot Retrieval API: `relevanceScore` (similitud coseno 0..1). */
  relevanceScore: number;
}

/**
 * Hit de recuperación, ESPEJO EXACTO de la forma de hit del Microsoft 365
 * Copilot Retrieval API (POST https://graph.microsoft.com/v1.0/copilot/retrieval,
 * verificado jun 2026) para que un WorkIQRetriever real sea un drop-in:
 *   retrievalHits[] → { webUrl, extracts[].text + relevanceScore,
 *                       resourceType, resourceMetadata, sensitivityLabel? }
 */
export interface RetrievalHit {
  recordId: string;
  /** Copilot Retrieval API: `webUrl` — link verificable a la evidencia. */
  webUrl: string;
  title: string;
  /** Copilot Retrieval API: `extracts[]` — fragmentos relevantes con su score. */
  extracts: RetrievalExtract[];
  /** Copilot Retrieval API: `resourceType` (p.ej. listItem, externalItem). */
  resourceType?: string;
  /** Copilot Retrieval API: `sensitivityLabel` — solo aparece en hits listItem (nullable). */
  sensitivityLabel?: string | null;
  /** Score de relevancia agregado 0..1 (nuestro ranking combinado). */
  score: number;
  /** Qué dimensiones de similitud coincidieron (nuestro aporte explicativo). */
  matchedDimensions: string[];
  /** Registro completo de respaldo. En Work IQ real esto se hidrataría aparte. */
  record: PastProjectRecord;
}

/** Campos del riesgo que produce el razonamiento (LLM o stub). */
export interface DerivedRiskCore {
  title: string;
  failureMode: string;
  whyItAppliesHere: string;
  earlyWarningSignals: string[];
  mitigation: string;
  /** 0..1 — confianza del razonamiento en que el riesgo aplica. */
  confidence: number;
}

/**
 * Contraanálisis (paso anti-confirmación): un segundo razonamiento escéptico
 * que intenta refutar que el riesgo se traslada al proyecto actual, y recalibra
 * la confianza. Muy en línea con el track Reasoning Agents.
 */
/** Valores válidos del veredicto de refutación (fuente única de verdad). */
export const STANDS = ["fuerte", "parcial", "débil"] as const;
export type Stands = (typeof STANDS)[number];

export interface Refutation {
  /** Qué tan bien se sostiene el riesgo tras intentar refutarlo. */
  stands: Stands;
  /** El contraargumento. */
  challenge: string;
  /** Confianza recalibrada 0..1 tras el contraanálisis. */
  adjustedConfidence: number;
}

/** Riesgo completo, ya anclado a su evidencia y rankeado. */
export interface DerivedRisk extends DerivedRiskCore {
  id: string;
  rank: number;
  failureCategory: string;
  /** Confianza antes del contraanálisis (la del primer razonamiento). */
  priorConfidence: number;
  /** Resultado del paso anti-confirmación. */
  refutation: Refutation;
  evidence: {
    caseId: string;
    caseName: string;
    webUrl: string;
    extract: string;
    year: number;
    outcome: string;
    severity: number;
    matchedDimensions: string[];
    retrievalScore: number;
    /** Términos del proyecto que aparecen también en la cita (para resaltar). */
    matchedTerms: string[];
  };
}

/** Un caso de la memoria que el agente inspeccionó (entró o no al reporte). */
export interface InspectedCase {
  caseId: string;
  caseName: string;
  year: number;
  failureCategory: string;
  score: number;
  matchedDimensions: string[];
  webUrl: string;
  included: boolean;
  /** Por qué entró o fue descartado. */
  reason: string;
}

/** Dictamen agregado del reporte (síntesis grounded de los riesgos). */
export interface Verdict {
  /** Índice de riesgo 0..100 (ponderado por severidad histórica, confianza y relevancia). */
  riskIndex: number;
  level: "alto" | "medio" | "bajo";
  /** Titular grounded: qué tienen en común los fracasos más parecidos. */
  headline: string;
  /** Categorías de fallo dominantes. */
  dominantThemes: string[];
  /** Casos de respaldo principales. */
  topCases: { caseId: string; caseName: string; year: number }[];
}

/** Un punto de la línea temporal de la simulación (un trimestre). */
export interface SimPoint {
  q: number; // índice de trimestre 0..N
  survival: number; // 0..1 — prob. de seguir vivo si IGNORAS las señales
  ignore: number; // 0..100 — salud/tracción proyectada ignorando señales
  mitigate: number; // 0..100 — salud/tracción si aplicas las mitigaciones
}

/** Un evento de riesgo proyectado en la línea temporal. */
export interface SimEvent {
  q: number;
  whenLabel: string; // "~Mes 9" / "~Año 2"
  title: string;
  failureCategory: string;
  caseName: string;
  caseId: string;
  webUrl: string;
  severity: number;
  impact: number; // 0..1 magnitud del golpe (severidad × confianza)
}

/** Simulación "si lo haces de todos modos" a 5–10 años, anclada a los riesgos. */
export interface Simulation {
  horizonQuarters: number;
  points: SimPoint[];
  events: SimEvent[];
  survival5y: number; // 0..1
  survival10y: number; // 0..1
  deadliest: SimEvent | null;
  summary: string; // titular grounded
}

/** Fracaso público real de OTRA empresa con una idea similar. */
export interface ExternalFailure {
  company: string;
  years: string; // "1999–2001"
  idea: string;
  bet: string;
  whyFailed: string;
  lesson: string;
  funding: string; // "$800M" o "—"
  source: string; // URL verificable
  archetypes: string[]; // etiquetas para el match
  // añadidos en runtime:
  score: number; // 0..1 relevancia respecto al proyecto del usuario
  matchedOn: string[]; // por qué hizo match
}

/** Un paso de la traza de razonamiento del agente (auditable). */
export interface TraceStep {
  /** Orden del paso (1..N). */
  step: number;
  /** Nombre corto del paso (p.ej. "perfilar", "recuperar"). */
  name: string;
  /** Qué hizo y qué decidió, en una línea legible. */
  detail: string;
  /** Duración del paso en milisegundos. */
  ms: number;
}

/** Una pregunta que el agente haría antes de confiar más en su análisis. */
export interface GapQuestion {
  /** Qué información falta en la descripción. */
  missing: string;
  /** La pregunta concreta. */
  question: string;
  /** Por qué importa: categoría de fallo de la memoria a la que se asocia. */
  failureCategory: string;
  /** Explicación de una línea. */
  why: string;
}

/** Un punto ciego de la memoria: dimensión del proyecto sin casos parecidos. */
export interface CoverageGap {
  /** Dimensión ("tech" | "apuesta" | "equipo" | "cliente"). */
  dimension: string;
  /** El valor del proyecto que la memoria no cubre. */
  value: string;
  /** Cuántos casos de la memoria tocan ese valor (0 o muy pocos). */
  casesInMemory: number;
}

/** El reporte pre-mortem completo. */
export interface PreMortemReport {
  /** Id persistente del informe (presente cuando se guardó en el historial). */
  id?: string;
  profile: ProjectProfile;
  verdict: Verdict;
  risks: DerivedRisk[];
  /** Simulación temporal "si lo haces de todos modos". */
  simulation: Simulation;
  /** Fracasos públicos reales de otras empresas con tu misma idea. */
  externalFailures: ExternalFailure[];
  /** Todos los casos inspeccionados (incluidos y descartados) — transparencia. */
  inspected: InspectedCase[];
  /** Traza auditable del razonamiento: qué hizo el agente, paso a paso, con tiempos. */
  trace: TraceStep[];
  /** Lo que el agente preguntaría: información ausente que limita el análisis. */
  gaps: GapQuestion[];
  /** Puntos ciegos: dimensiones del proyecto que la memoria no cubre. */
  coverage: CoverageGap[];
  /** Proveedor de razonamiento usado (stub | openai | azure | anthropic). */
  generatedWith: string;
  /** Recuperador de memoria usado (synthetic | workiq). */
  retrieverUsed: string;
  /** Cuántos casos pasados se inspeccionaron. */
  casesInspected: number;
  generatedAt: string;
}
