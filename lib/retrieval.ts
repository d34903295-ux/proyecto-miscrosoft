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
 * Adaptador REAL a Azure AI Search "clásico" (`/indexes/.../docs/search`) — el motor
 * de indexación sobre el que corre Foundry IQ, expuesto directo. Es el camino REAL
 * más simple y robusto (solo necesita un servicio de Azure AI Search, sin Azure OpenAI):
 * útil como fallback garantizado del FoundryIQRetriever de abajo.
 *
 * Siembra la memoria con:  npm run seed:azure  (ver scripts/seed-azure-search.mjs).
 * Luego: RETRIEVER=azuresearch  +  AZURE_SEARCH_ENDPOINT / AZURE_SEARCH_API_KEY / AZURE_SEARCH_INDEX.
 *
 * Consulta full-text el índice, reconstruye el registro, y MEZCLA el score de Azure
 * con el solapamiento de las 4 dimensiones (igual que el SyntheticRetriever), de modo
 * que el resto del agente y la UI no cambian. webUrl sigue apuntando a /case/{id}.
 */
export class AzureSearchRetriever implements MemoryRetriever {
  readonly name = "azuresearch";

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

/**
 * Adaptador REAL a **Microsoft Foundry IQ** (agentic retrieval) — la integración
 * de IQ que exige el hackathon. NO es la búsqueda clásica: llama al endpoint de
 * recuperación agéntica de una *knowledge base* de Foundry IQ, que planea la
 * consulta con un modelo, busca en sus *knowledge sources* y devuelve grounding
 * extractivo con citas. Contrato verificado (jun 2026):
 *
 *   POST https://<servicio>.search.windows.net/knowledgebases/<kb>/retrieve
 *        ?api-version=2026-05-01-preview            ← preview (síntesis/planeo)
 *        ?api-version=2026-04-01                      ← GA (extractivo mínimo)
 *   Authorization: Bearer <token search.azure.com>   ← o  api-key: <admin key>
 *   {
 *     "messages": [{ "role":"user", "content":[{ "type":"text", "text":"<query>" }]}],
 *     "knowledgeSourceParams": [{
 *        "knowledgeSourceName": "<ks>", "kind": "searchIndex",
 *        "includeReferences": true, "includeReferenceSourceData": true,
 *        "maxOutputDocuments": k
 *     }],
 *     "outputMode": "extractedData"
 *   }
 *
 * Respuesta: { response[].content[].text (grounding JSON con ref_id/title/content),
 *              references[] { id, docKey, sourceData{...campos del índice...},
 *              sensitivityLabelInfo }, activity[] }. Mapeamos references[].sourceData
 * 1:1 a PastProjectRecord, así el resto del agente y la UI NO cambian.
 *
 * Provisión (una vez):  npm run seed:foundryiq  (crea índice + knowledge source +
 * knowledge base con tu modelo de Azure OpenAI). Luego RETRIEVER=foundryiq.
 */
export class FoundryIQRetriever implements MemoryRetriever {
  readonly name = "foundryiq";

  async retrieve(profile: ProjectProfile, k: number): Promise<RetrievalHit[]> {
    const endpoint = (process.env.AZURE_SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
    const kb = process.env.FOUNDRY_KB_NAME ?? "company-memory-kb";
    const ks = process.env.FOUNDRY_KS_NAME ?? "company-memory-ks";
    const apiKey = process.env.AZURE_SEARCH_API_KEY ?? "";
    const bearer = process.env.FOUNDRY_BEARER_TOKEN ?? "";
    const apiVersion = process.env.FOUNDRY_API_VERSION ?? "2026-05-01-preview";

    const queryText = [
      profile.raw,
      profile.keywords.join(" "),
      profile.tech.join(" "),
      profile.marketBet.join(" "),
      profile.teamDynamics.join(" "),
    ].join(" . ").slice(0, 1500);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
    else headers["api-key"] = apiKey;

    const knowledgeSourceParams = [
      {
        knowledgeSourceName: ks,
        kind: "searchIndex",
        includeReferences: true,
        includeReferenceSourceData: true,
        maxOutputDocuments: Math.max(k, 10),
      },
    ];
    // La GA (2026-04-01) usa `intents` y es extractiva mínima; la preview usa
    // `messages` + outputMode. Enviamos el cuerpo correcto según la api-version.
    const isPreview = apiVersion.includes("preview");
    const body = isPreview
      ? {
          messages: [{ role: "user", content: [{ type: "text", text: queryText }] }],
          knowledgeSourceParams,
          outputMode: "extractedData",
          includeActivity: false,
        }
      : {
          intents: [{ type: "semantic", search: queryText }],
          knowledgeSourceParams,
        };

    const res = await fetch(
      `${endpoint}/knowledgebases/${kb}/retrieve?api-version=${apiVersion}`,
      { method: "POST", headers, body: JSON.stringify(body) }
    );
    if (!res.ok && res.status !== 206) {
      throw new Error(`Foundry IQ retrieve HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();

    // Texto de grounding: response[].content[].text es un JSON array de {ref_id,title,content}.
    const groundingById = new Map<string, string>();
    for (const msg of data.response ?? []) {
      for (const part of msg.content ?? []) {
        if (part.type !== "text" || typeof part.text !== "string") continue;
        try {
          for (const g of JSON.parse(part.text)) {
            if (g && g.ref_id != null) groundingById.set(String(g.ref_id), String(g.content ?? ""));
          }
        } catch {
          /* el grounding puede venir como prosa; lo ignoramos y usamos sourceData */
        }
      }
    }

    const refs: any[] = (data.references ?? []).filter((r: any) => r && r.sourceData);
    const n = Math.max(1, refs.length);

    const scored = refs.map((ref, i) => {
      const r = toRecord(ref.sourceData);
      // Foundry IQ devuelve las referencias ya rankeadas; usamos la posición como
      // proxy de relevancia (1.0 la primera) y la mezclamos con las dimensiones.
      const textScore = (n - i) / n;
      const dim = dimensionMatch(profile, r);
      const combined = 0.55 * textScore + 0.45 * dim.score;
      const grounding = groundingById.get(String(ref.id)) || r.whatWentWrong;
      const sens =
        ref.sensitivityLabelInfo?.labelName ?? (r as any).sensitivityLabel ?? null;
      return { r, textScore, dim, combined, grounding, sens };
    });
    scored.sort((a, b) => b.combined - a.combined);

    return scored.slice(0, k).map(({ r, textScore, dim, combined, grounding, sens }) => ({
      recordId: r.id,
      webUrl: `/case/${r.id}`,
      title: r.name,
      extracts: [
        { text: grounding, relevanceScore: Number(textScore.toFixed(4)) },
        { text: `Apuesta: ${r.assumption}`, relevanceScore: Number(textScore.toFixed(4)) },
      ],
      resourceType: "listItem",
      sensitivityLabel: sens,
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
  if (which === "foundryiq") {
    const hasAuth =
      process.env.AZURE_SEARCH_API_KEY || process.env.FOUNDRY_BEARER_TOKEN;
    if (process.env.AZURE_SEARCH_ENDPOINT && hasAuth) return new FoundryIQRetriever();
    console.warn(
      "[retriever] Config de Foundry IQ ausente (AZURE_SEARCH_ENDPOINT + AZURE_SEARCH_API_KEY/FOUNDRY_BEARER_TOKEN). Corre `npm run seed:foundryiq` primero — uso synthetic."
    );
  }
  if (which === "azuresearch") {
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
