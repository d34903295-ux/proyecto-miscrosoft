// ─────────────────────────────────────────────────────────────
// Provisiona Microsoft FOUNDRY IQ (agentic retrieval) de punta a punta sobre
// un servicio de Azure AI Search:
//
//   1) Índice "company-memory"        ← la memoria de la empresa (30 casos)
//   2) Knowledge SOURCE (searchIndex)  ← envuelve ese índice para Foundry IQ
//   3) Knowledge BASE                  ← lo que el agente consulta en /retrieve
//
// Es la integración de Microsoft IQ que exige el hackathon, REAL y factible con
// una cuenta Azure gratuita ($200 de crédito, SIN licencia Copilot).
//
// Uso:
//   1) Crea un servicio de Azure AI Search (free/basic tier sirve) en el portal.
//   2) (Opcional, recomendado) crea un recurso de Azure OpenAI y despliega un
//      modelo chat (p.ej. gpt-4o-mini) — habilita el planeo agéntico de consultas.
//   3) En .env.local:
//        AZURE_SEARCH_ENDPOINT=https://TU-BUSQUEDA.search.windows.net
//        AZURE_SEARCH_API_KEY=<admin key>
//        AZURE_SEARCH_INDEX=company-memory
//        FOUNDRY_KS_NAME=company-memory-ks
//        FOUNDRY_KB_NAME=company-memory-kb
//        # opcional (planeo agéntico): AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT
//   4) npm run seed:foundryiq
//   5) RETRIEVER=foundryiq  → la app consulta Foundry IQ en vivo.
// ─────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const endpoint = (process.env.AZURE_SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
const apiKey = process.env.AZURE_SEARCH_API_KEY ?? "";
const index = process.env.AZURE_SEARCH_INDEX ?? "company-memory";
const ks = process.env.FOUNDRY_KS_NAME ?? "company-memory-ks";
const kb = process.env.FOUNDRY_KB_NAME ?? "company-memory-kb";
// La provisión de knowledge source/base requiere una api-version preview.
const provVersion = process.env.FOUNDRY_PROVISION_API_VERSION ?? "2026-05-01-preview";
const dataVersion = process.env.AZURE_SEARCH_API_VERSION ?? "2024-07-01";

// Azure OpenAI (opcional): si está, la knowledge base planea consultas con el modelo.
const aoaiEndpoint = (process.env.AZURE_OPENAI_ENDPOINT ?? "").replace(/\/$/, "");
const aoaiKey = process.env.AZURE_OPENAI_API_KEY ?? "";
const aoaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "";

if (!endpoint || !apiKey) {
  console.error(
    "Faltan credenciales. Define AZURE_SEARCH_ENDPOINT y AZURE_SEARCH_API_KEY en .env.local.\n" +
      "Crea un servicio de Azure AI Search (free tier) y copia su URL y una admin key."
  );
  process.exit(1);
}

const records = JSON.parse(
  readFileSync(join(process.cwd(), "lib", "memory", "company_memory.json"), "utf8")
);

const indexSchema = {
  name: index,
  fields: [
    { name: "id", type: "Edm.String", key: true, filterable: true },
    { name: "name", type: "Edm.String", searchable: true },
    { name: "year", type: "Edm.Int32", filterable: true, sortable: true },
    { name: "clientType", type: "Edm.String", searchable: true, filterable: true, facetable: true },
    { name: "tech", type: "Collection(Edm.String)", searchable: true, filterable: true, facetable: true },
    { name: "marketBet", type: "Edm.String", searchable: true, filterable: true, facetable: true },
    { name: "teamDynamics", type: "Edm.String", searchable: true, filterable: true, facetable: true },
    { name: "description", type: "Edm.String", searchable: true },
    { name: "assumption", type: "Edm.String", searchable: true },
    { name: "whatWentWrong", type: "Edm.String", searchable: true },
    { name: "ignoredSignals", type: "Collection(Edm.String)", searchable: true },
    { name: "outcome", type: "Edm.String", searchable: true },
    { name: "severity", type: "Edm.Int32", filterable: true, sortable: true },
    { name: "failureCategory", type: "Edm.String", searchable: true, filterable: true, facetable: true },
    { name: "mitigation", type: "Edm.String", searchable: true },
  ],
  // El semantic ranker mejora la recuperación agéntica de Foundry IQ.
  semantic: {
    configurations: [
      {
        name: "default",
        prioritizedFields: {
          titleField: { fieldName: "name" },
          prioritizedContentFields: [
            { fieldName: "whatWentWrong" },
            { fieldName: "description" },
            { fieldName: "assumption" },
          ],
          prioritizedKeywordsFields: [{ fieldName: "failureCategory" }],
        },
      },
    ],
  },
};

const sourceDataFieldNames = indexSchema.fields.map((f) => f.name);

async function call(method, path, body, version) {
  const res = await fetch(`${endpoint}${path}?api-version=${version}`, {
    method,
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function ensureKnowledgeSource() {
  // Distintas api-versions nombran este campo `sourceDataSelect` (string) o
  // `sourceDataFields` (array). Probamos el moderno y caemos al clásico.
  const base = { name: ks, kind: "searchIndex", description: "Memoria institucional de proyectos pasados." };
  const modern = {
    ...base,
    searchIndexParameters: {
      searchIndexName: index,
      sourceDataFields: sourceDataFieldNames.map((fieldName) => ({ fieldName })),
    },
  };
  const classic = {
    ...base,
    searchIndexParameters: {
      searchIndexName: index,
      sourceDataSelect: sourceDataFieldNames.join(","),
    },
  };
  try {
    await call("PUT", `/knowledgeSources/${ks}`, modern, provVersion);
  } catch (e) {
    console.warn(`  · sourceDataFields no aceptado (${e.message.slice(0, 80)}…) — reintento con sourceDataSelect`);
    await call("PUT", `/knowledgeSources/${ks}`, classic, provVersion);
  }
}

async function ensureKnowledgeBase() {
  const useModel = aoaiEndpoint && aoaiKey && aoaiDeployment;
  const kbDef = {
    name: kb,
    description: "Knowledge base de la memoria institucional para el agente Pre-Mortem.",
    knowledgeSources: [{ name: ks }],
    ...(useModel
      ? {
          outputMode: "extractedData",
          models: [
            {
              kind: "azureOpenAI",
              azureOpenAIParameters: {
                resourceUri: aoaiEndpoint,
                apiKey: aoaiKey,
                deploymentId: aoaiDeployment,
                modelName: aoaiDeployment,
              },
            },
          ],
        }
      : {}),
  };
  await call("PUT", `/knowledgebases/${kb}`, kbDef, provVersion);
  return useModel;
}

async function main() {
  console.log(`→ [1/4] Índice "${index}" en ${endpoint} …`);
  await call("PUT", `/indexes/${index}`, indexSchema, dataVersion);

  console.log(`→ [2/4] Subiendo ${records.length} registros …`);
  const result = await call(
    "POST",
    `/indexes/${index}/docs/index`,
    { value: records.map((r) => ({ "@search.action": "mergeOrUpload", ...r })) },
    dataVersion
  );
  const ok = (result.value ?? []).filter((x) => x.status).length;
  console.log(`  ✓ ${ok}/${records.length} documentos indexados.`);

  console.log(`→ [3/4] Knowledge source "${ks}" (Foundry IQ) …`);
  await ensureKnowledgeSource();
  console.log(`  ✓ knowledge source lista.`);

  console.log(`→ [4/4] Knowledge base "${kb}" (Foundry IQ) …`);
  const withModel = await ensureKnowledgeBase();
  console.log(
    `  ✓ knowledge base lista${withModel ? " (con planeo agéntico vía Azure OpenAI)" : " (extractiva; sin modelo)"}.`
  );

  console.log(`\n✓ Foundry IQ provisionado.`);
  console.log(`  En .env.local pon:  RETRIEVER=foundryiq`);
  console.log(`                      FOUNDRY_KB_NAME=${kb}`);
  console.log(`                      FOUNDRY_KS_NAME=${ks}`);
  if (!withModel) console.log(`                      FOUNDRY_API_VERSION=2026-04-01   (KB extractiva, sin modelo)`);
  console.log(`  Reinicia la app: el agente consultará Foundry IQ en vivo.`);
}

main().catch((e) => {
  console.error("\n✗ Error provisionando Foundry IQ:\n", e.message);
  console.error(
    "\nSi falló la knowledge source/base, tu servicio de Azure AI Search puede no" +
      " soportar aún la api-version de agentic retrieval. Dos salidas REALES:\n" +
      "  a) Créalas en el portal de Azure AI Foundry (Knowledge bases → New) apuntando\n" +
      `     al índice "${index}", y deja RETRIEVER=foundryiq.\n` +
      "  b) Usa el fallback garantizado de Azure AI Search clásico:\n" +
      "       npm run seed:azure   &&   RETRIEVER=azuresearch\n"
  );
  process.exit(1);
});
