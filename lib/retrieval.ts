// ─────────────────────────────────────────────────────────────
// Recuperación de la "memoria de la empresa".
//
//   MemoryRetriever     → interfaz única (retrieve)
//   SyntheticRetriever  → store local de proyectos pasados (default).
//                         Combina similitud semántica (TF-IDF/coseno) con
//                         solapamiento de las 4 dimensiones que importan:
//                         tipo de cliente, tecnología, apuesta de mercado,
//                         dinámica de equipo.
//   WorkIQRetriever     → stub del adaptador REAL a Microsoft Work IQ /
//                         Copilot Retrieval API. Mismo contrato → drop-in.
//
// El tipo de retorno (RetrievalHit) está modelado sobre la forma de hit del
// Copilot Retrieval API (webUrl, extracts[].text) justamente para que cambiar
// de sintético a Work IQ real sea un swap de implementación, no una reescritura.
// ─────────────────────────────────────────────────────────────

import type { PastProjectRecord, ProjectProfile, RetrievalHit } from "./types";
import { buildVectorizer, vectorizeQuery, cosine } from "./textsim";
import { allRecords, memoryVersion, recordById } from "./memorystore";

export interface MemoryRetriever {
  readonly name: string;
  retrieve(profile: ProjectProfile, k: number): Promise<RetrievalHit[]>;
}

function recordText(r: PastProjectRecord): string {
  return [
    r.name,
    r.description,
    r.assumption,
    r.whatWentWrong,
    r.failureCategory,
    r.tech.join(" "),
    r.marketBet,
    r.teamDynamics,
    r.ignoredSignals.join(" "),
  ].join(" . ");
}

function dimensionMatch(
  profile: ProjectProfile,
  r: PastProjectRecord
): { score: number; labels: string[] } {
  const labels: string[] = [];
  let matched = 0;

  if (profile.clientType !== "desconocido" && profile.clientType === r.clientType) {
    matched += 1;
    labels.push(`tipo de cliente (${r.clientType})`);
  }
  const techOverlap = r.tech.filter((t) => profile.tech.includes(t));
  if (techOverlap.length) {
    matched += 1;
    labels.push(`tecnología (${techOverlap.join(", ")})`);
  }
  if (profile.marketBet.includes(r.marketBet)) {
    matched += 1;
    labels.push(`apuesta de mercado (${r.marketBet})`);
  }
  if (profile.teamDynamics.includes(r.teamDynamics)) {
    matched += 1;
    labels.push(`dinámica de equipo (${r.teamDynamics})`);
  }

  return { score: matched / 4, labels };
}

export class SyntheticRetriever implements MemoryRetriever {
  readonly name = "synthetic";
  private idf: Map<string, number>;
  private vectors: Map<string, number>[];

  constructor(private records: PastProjectRecord[] = allRecords()) {
    const corpus = this.records.map(recordText);
    const v = buildVectorizer(corpus);
    this.idf = v.idf;
    this.vectors = v.vectors;
  }

  async retrieve(profile: ProjectProfile, k: number): Promise<RetrievalHit[]> {
    const queryText = [
      profile.raw,
      profile.keywords.join(" "),
      profile.tech.join(" "),
      profile.marketBet.join(" "),
      profile.teamDynamics.join(" "),
    ].join(" . ");
    const qVec = vectorizeQuery(queryText, this.idf);

    const scored = this.records.map((r, i) => {
      const textScore = cosine(qVec, this.vectors[i]);
      const dim = dimensionMatch(profile, r);
      // Mezcla: la semántica encuentra parecido temático; las dimensiones
      // aseguran que coincida en lo que el usuario considera "similar".
      const combined = 0.55 * textScore + 0.45 * dim.score;
      return { r, combined, textScore, dim };
    });

    scored.sort((a, b) => b.combined - a.combined);

    return scored.slice(0, k).map(({ r, combined, textScore, dim }) => ({
      recordId: r.id,
      webUrl: `/case/${r.id}`,
      title: r.name,
      // relevanceScore espeja el coseno del Copilot Retrieval API (0..1).
      extracts: [
        { text: r.whatWentWrong, relevanceScore: Number(textScore.toFixed(4)) },
        { text: `Apuesta: ${r.assumption}`, relevanceScore: Number(textScore.toFixed(4)) },
      ],
      resourceType: "listItem",
      sensitivityLabel: null,
      score: Number(combined.toFixed(4)),
      matchedDimensions: dim.labels,
      record: r,
    }));
  }
}

/**
 * Stub del adaptador REAL a Microsoft 365 Copilot Retrieval API
 * (la superficie pública más cercana a Work IQ). Datos verificados jun 2026:
 *
 *   POST https://graph.microsoft.com/v1.0/copilot/retrieval     ← GA (no /beta)
 *   Authorization: Bearer <token Entra DELEGADO del usuario>     ← OBO; app-only NO soportado
 *   {
 *     "queryString": "<descripción + dimensiones>",   // máx 1500 chars
 *     "dataSource": "sharePoint",                       // | oneDriveBusiness | externalItem (connectors)
 *     "filterExpression": "<KQL>",                      // opcional
 *     "resourceMetadata": ["title", "author"],          // metadatos a devolver
 *     "maximumNumberOfResults": k                        // 1..25
 *   }
 *
 * Respuesta: retrievalHits[] con { webUrl, extracts[].text + relevanceScore (coseno),
 * resourceType, resourceMetadata, sensitivityLabel } → mapea 1:1 a nuestro RetrievalHit.
 * Por eso el resto del agente NO cambia.
 *
 * Coste/licencia: gratis con licencia M365 Copilot, o PAYG ($0.10/llamada) que AÚN
 * requiere ≥1 licencia Copilot en el tenant. Sin licencia no hay acceso. La memoria
 * de la empresa se cargaría vía Graph connectors (externalItem). Inviable de cero en
 * 5 días en solitario → de ahí el SyntheticRetriever como puente. Ver README.
 *
 * NOTA Work IQ: la Work IQ API (A2A/MCP) está en preview; su REST está "coming soon"
 * y GA es 16-jun-2026 (después del cierre del hackathon, 14-jun). Por eso el camino
 * "real" recomendado para el track es Foundry IQ (abajo), no Work IQ REST.
 */
export class WorkIQRetriever implements MemoryRetriever {
  readonly name = "workiq";
  async retrieve(_profile: ProjectProfile, _k: number): Promise<RetrievalHit[]> {
    throw new Error(
      "WorkIQRetriever no está configurado. La Copilot Retrieval API requiere licencia " +
        "M365 Copilot (auth delegada/OBO) y la Work IQ REST API GA es 16-jun-2026. " +
        "Usa RETRIEVER=synthetic para el demo. Ver README → 'Cambiar a memoria real'."
    );
  }
}

/**
 * Adaptador REAL a Azure AI Search — el motor de recuperación sobre el que corre
 * Azure AI Foundry IQ. Es la ruta de datos reales FACTIBLE para el track Reasoning
 * Agents (free tier + $200 de crédito Azure, SIN licencia Copilot).
 *
 * Siembra la memoria con:  npm run seed:azure  (ver scripts/seed-azure-search.mjs).
 * Luego: RETRIEVER=foundryiq  +  AZURE_SEARCH_ENDPOINT / AZURE_SEARCH_API_KEY / AZURE_SEARCH_INDEX.
 *
 * Consulta full-text el índice, reconstruye el registro, y MEZCLA el score de Azure
 * con el solapamiento de las 4 dimensiones (igual que el SyntheticRetriever), de modo
 * que el resto del agente y la UI no cambian. webUrl sigue apuntando a /case/{id}.
 */
export class AzureSearchRetriever implements MemoryRetriever {
  readonly name = "foundryiq";

  async retrieve(profile: ProjectProfile, k: number): Promise<RetrievalHit[]> {
    const endpoint = (process.env.AZURE_SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
    const index = process.env.AZURE_SEARCH_INDEX ?? "company-memory";
    const apiKey = process.env.AZURE_SEARCH_API_KEY ?? "";
    const apiVersion = process.env.AZURE_SEARCH_API_VERSION ?? "2024-07-01";

    const queryText = [
      profile.raw,
      profile.keywords.join(" "),
      profile.tech.join(" "),
      profile.marketBet.join(" "),
      profile.teamDynamics.join(" "),
    ].join(" . ").slice(0, 1500);

    const res = await fetch(
      `${endpoint}/indexes/${index}/docs/search?api-version=${apiVersion}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          search: queryText,
          searchMode: "any",
          queryType: "simple",
          top: Math.max(k, 10),
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Azure AI Search HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const docs: any[] = data.value ?? [];
    const maxScore = Math.max(1e-9, ...docs.map((d) => d["@search.score"] ?? 0));

    const scored = docs.map((d) => {
      const r = toRecord(d);
      const textScore = (d["@search.score"] ?? 0) / maxScore; // normalizado 0..1
      const dim = dimensionMatch(profile, r);
      const combined = 0.55 * textScore + 0.45 * dim.score;
      return { r, textScore, dim, combined };
    });
    scored.sort((a, b) => b.combined - a.combined);

    return scored.slice(0, k).map(({ r, textScore, dim, combined }) => ({
      recordId: r.id,
      webUrl: `/case/${r.id}`,
      title: r.name,
      extracts: [
        { text: r.whatWentWrong, relevanceScore: Number(textScore.toFixed(4)) },
        { text: `Apuesta: ${r.assumption}`, relevanceScore: Number(textScore.toFixed(4)) },
      ],
      resourceType: "listItem",
      sensitivityLabel: null,
      score: Number(combined.toFixed(4)),
      matchedDimensions: dim.labels,
      record: r,
    }));
  }
}

/** Reconstruye un PastProjectRecord desde un documento de Azure AI Search. */
function toRecord(d: any): PastProjectRecord {
  return {
    id: d.id,
    name: d.name ?? d.id,
    year: typeof d.year === "number" ? d.year : Number(d.year) || 0,
    clientType: d.clientType ?? "desconocido",
    tech: Array.isArray(d.tech) ? d.tech : [],
    marketBet: d.marketBet ?? "",
    teamDynamics: d.teamDynamics ?? "",
    description: d.description ?? "",
    assumption: d.assumption ?? "",
    whatWentWrong: d.whatWentWrong ?? "",
    ignoredSignals: Array.isArray(d.ignoredSignals) ? d.ignoredSignals : [],
    outcome: d.outcome ?? "",
    severity: typeof d.severity === "number" ? d.severity : Number(d.severity) || 3,
    failureCategory: d.failureCategory ?? "General",
    mitigation: d.mitigation ?? "",
  };
}

// El SyntheticRetriever construye los vectores TF-IDF de todo el corpus en su
// constructor; cachearlo evita rehacer ese trabajo en cada request. Se invalida
// cuando la memoria viva cambia (casos agregados/borrados en runtime).
let syntheticSingleton: SyntheticRetriever | null = null;
let syntheticVersion = -1;
function getSynthetic(): SyntheticRetriever {
  const v = memoryVersion();
  if (!syntheticSingleton || syntheticVersion !== v) {
    syntheticSingleton = new SyntheticRetriever();
    syntheticVersion = v;
  }
  return syntheticSingleton;
}

export function getRetriever(): MemoryRetriever {
  const which = (process.env.RETRIEVER ?? "synthetic").toLowerCase();
  if (which === "workiq") {
    const hasCreds =
      process.env.WORKIQ_TENANT_ID &&
      process.env.WORKIQ_CLIENT_ID &&
      process.env.WORKIQ_CLIENT_SECRET;
    if (hasCreds) return new WorkIQRetriever();
    console.warn("[retriever] Credenciales de Work IQ ausentes — uso synthetic.");
  }
  if (which === "foundryiq" || which === "azuresearch") {
    if (process.env.AZURE_SEARCH_ENDPOINT && process.env.AZURE_SEARCH_API_KEY)
      return new AzureSearchRetriever();
    console.warn("[retriever] Config de Azure AI Search ausente — uso synthetic.");
  }
  return getSynthetic();
}

export function getAllRecords(): PastProjectRecord[] {
  return allRecords();
}

export function getRecordById(id: string): PastProjectRecord | undefined {
  return recordById(id);
}
