// ─────────────────────────────────────────────────────────────
// Siembra la memoria de la empresa en un índice de Azure AI Search
// (el motor de recuperación detrás de Foundry IQ). Ruta de datos REALES
// factible para el track Reasoning Agents: free tier, sin licencia Copilot.
//
// Uso:
//   1) Crea un servicio de Azure AI Search (free tier sirve).
//   2) Pon AZURE_SEARCH_ENDPOINT / AZURE_SEARCH_API_KEY / AZURE_SEARCH_INDEX en .env.local
//   3) npm run seed:azure
//   4) RETRIEVER=foundryiq  → la app consulta memoria real.
// ─────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Carga simple de .env.local (Node no lo hace solo).
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
const apiVersion = process.env.AZURE_SEARCH_API_VERSION ?? "2024-07-01";

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
};

async function call(method, path, body) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  console.log(`→ Creando/actualizando índice "${index}" en ${endpoint} …`);
  await call("PUT", `/indexes/${index}?api-version=${apiVersion}`, indexSchema);

  console.log(`→ Subiendo ${records.length} registros …`);
  const result = await call("POST", `/indexes/${index}/docs/index?api-version=${apiVersion}`, {
    value: records.map((r) => ({ "@search.action": "mergeOrUpload", ...r })),
  });
  const ok = (result.value ?? []).filter((x) => x.status).length;
  console.log(`✓ Listo: ${ok}/${records.length} documentos indexados.`);
  console.log(`\nAhora pon RETRIEVER=foundryiq en .env.local y reinicia la app.`);
}

main().catch((e) => {
  console.error("✗ Error sembrando Azure AI Search:\n", e.message);
  process.exit(1);
});
