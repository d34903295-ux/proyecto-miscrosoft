# 🪦 Pre-Mortem Institucional

> **No predice: recuerda.** Antes de lanzar un proyecto, este agente busca en la
> memoria de la empresa proyectos pasados con características similares, extrae
> qué salió mal en ellos y genera un **reporte pre-mortem**: los modos de fallo
> más probables para tu proyecto actual, **cada uno anclado a un caso real que
> puedes abrir y verificar**, más una mitigación sugerida.

Hecho para **Microsoft Agents League** · Track **Reasoning Agents**.

> 📖 ¿Cómo funciona, paso a paso? → **[`COMO-FUNCIONA.md`](./COMO-FUNCIONA.md)** (explicación para jueces).

> 🎬 **Video demo:** **https://youtu.be/XyVPeMP0FBs**

> **TL;DR (English):** Before launching a project, this reasoning agent searches
> your company's institutional memory for similar past projects, extracts what
> went wrong, and produces a pre-mortem report — every risk anchored to a real,
> openable case (rule: *recall, don't invent*). It then tries to **refute its own
> findings** (anti-confirmation pass), tells you **what it would ask** (missing
> info), admits **where its memory is blind** (coverage gaps), exposes its full
> **reasoning trace**, and ships with a **golden-set eval harness** (`npm run
> eval`) that scores recall, evidence integrity, calibration and determinism —
> currently **8/8 (100%)** on retrieval with zero integrity violations.

---

## Demo en 2 minutos (guion para jueces)

1. `npm install && npm run dev` → abre **http://localhost:3000** (corre sin API keys).
2. Toca **chatbot IA soporte** (ejemplo) → **[ ejecutar pre-mortem ]**. Mira el
   dictamen, el riesgo #1 con su caso real, la **matriz de riesgo** y abre la
   **traza de razonamiento** al final.
3. Abre **// portafolio** → "cargar ejemplo" → analiza 3 proyectos en paralelo
   y míralos rankeados por riesgo.
4. Agrega un caso a la memoria (`POST /api/memory`) y vuelve a analizar: el
   agente **lo recuerda al instante** (memoria viva).
5. `npm test` (22 ✓) y `npm run eval` (**recuerdo 8/8**, evidencia íntegra,
   determinismo ✓) — el razonamiento no se afirma: **se mide**.

---

## La idea en una frase

La mayoría de los proyectos no fallan por razones nuevas: fallan por las mismas
razones por las que fallaron otros antes, dentro de la misma empresa. El
conocimiento existe, pero está disperso y nadie lo recuerda en el momento de
decidir. Este agente convierte esa memoria institucional en una advertencia
accionable y **trazable a evidencia**, nunca inventada.

## Cómo funciona (razonamiento multi-paso)

```
Descripción del proyecto nuevo
        │
        ▼
1. Perfilar  ──────────►  tipo de cliente · tecnología · apuesta de mercado · dinámica de equipo
        │
        ▼
2. Recuperar  ─────────►  los proyectos pasados MÁS similares de la memoria de la empresa
        │                  (similitud semántica TF-IDF + solapamiento de las 4 dimensiones)
        ▼
3. Deduplicar  ────────►  un riesgo por modo de fallo (no repetir la misma categoría)
        │
        ▼
4. Mapear  ────────────►  por cada caso: extraer el riesgo y MAPEARLO al proyecto actual,
        │                  anclado a la evidencia real del caso (regla: no inventar)
        ▼
5. Refutar  ───────────►  paso ANTI-CONFIRMACIÓN: un segundo razonamiento escéptico
        │                  intenta refutar cada riesgo y recalibra su confianza
        ▼
6. Rankear  ───────────►  relevancia × confianza calibrada × severidad histórica
        │
        ▼
7. Autoevaluar  ───────►  qué información FALTA en la descripción (preguntas) y
        │                  en qué dimensiones la memoria está CIEGA (cobertura)
        ▼
Reporte pre-mortem: riesgos rankeados, cada uno con su caso de respaldo y mitigación
```

Cada paso queda registrado en una **traza de razonamiento auditable** (qué
decidió y cuánto tardó) que se muestra al final del reporte y se incluye en la
exportación.

Además del ranking, el reporte incluye:

- **Contraanálisis visible por riesgo** — el veredicto del paso de refutación
  (`fuerte / parcial / débil`) y cómo movió la confianza, mostrado en la UI.
- **Matriz de riesgo** — cada riesgo posicionado por severidad histórica ×
  confianza calibrada; la cola de cada punto muestra cuánto lo movió la
  refutación, y el cuadrante crítico («actuar ya») queda señalado.
- **Lo que el agente preguntaría** — detección de información ausente en la
  descripción (plazo, equipo, métrica de éxito, validación, dependencias,
  datos), cada pregunta anclada a la categoría de fallo real que la motiva.
- **Puntos ciegos de la memoria** — si la memoria no tiene casos en alguna
  dimensión del proyecto, el agente lo dice: *el silencio no significa que no
  haya riesgo*. Honestidad epistémica, no solo recuperación.
- **Simulación "¿y si lo haces de todos modos?"** — proyección a 10 años de la
  supervivencia del proyecto, donde cada golpe de la curva viene de un riesgo
  real derivado (no de números inventados), con escenario *ignorar* vs *mitigar*.
- **"Ya lo intentaron"** — fracasos públicos reales de otras empresas con una
  idea similar, cada uno con fuente verificable (memoria externa que complementa
  la memoria interna tipo Work IQ).
- **Transparencia de recuperación** — TODOS los casos inspeccionados, incluidos
  y descartados, con el motivo real (dedupe vs fuera del top).
- **Traza de razonamiento** — los 7 pasos del agente, con la decisión tomada y
  el tiempo de cada uno, auditables desde la propia UI.

## Cómo evaluamos el razonamiento (`npm run eval`)

El agente no se juzga por lo bonito del reporte sino por si **recuerda el caso
correcto**. El harness de evaluación (`scripts/eval.mjs`) ejecuta un *golden
set* de 8 proyectos con resultado esperado conocido y mide cuatro cosas:

| Métrica | Qué comprueba | Resultado actual |
|---|---|---|
| **Recuerdo** | La categoría de fallo esperada aparece en el top-3 | **8/8 (100%)** |
| **Integridad de evidencia** | Cada riesgo cita un caso real, abrible y presente en los inspeccionados | ✓ sin violaciones |
| **Calibración** | Confianza en rango y veredicto de refutación coherente con ella | ✓ coherente |
| **Determinismo** | Con el motor stub, misma entrada → mismo reporte | ✓ |

```bash
npm run dev    # en una terminal
npm run eval   # en otra — código de salida ≠ 0 si algo falla
```

## La regla clave: "recuerda, no inventa"

Cada riesgo se compone **estrictamente a partir de un registro pasado
recuperado**. Con el cliente `stub` (por defecto) esto es literal: el texto del
riesgo se arma desde los campos del caso real, así que es imposible alucinar. Con
un LLM real, el *prompt* del sistema le prohíbe introducir hechos que no estén en
el caso pasado; solo puede mapear ese caso al proyecto actual. Cada riesgo trae
un link clickeable al registro completo para **abrir y verificar**.

---

## Microsoft IQ — Integración con **Foundry IQ** (capa de IQ exigida por el hackathon)

> La regla del Agents League exige integrar **al menos una capa Microsoft IQ**
> (Foundry IQ, Work IQ o Fabric IQ). Este proyecto integra **Foundry IQ** — la
> capa de recuperación agéntica de conocimiento de Azure AI Foundry, construida
> sobre Azure AI Search — como su memoria institucional real.

**Dos niveles de integración Foundry (elige según tu acceso):**

1. **Modelo de Foundry (mínimo, GRATIS, sin Azure)** — los jueces confirmaron que
   el mínimo es *"at least one Microsoft Foundry hosted model"*. Dos formas, ambas
   sin tarjeta:
   - `LLM_PROVIDER=github` → **GitHub Models**, el tier gratuito de los Microsoft
     Foundry Models (nube, **sin instalar nada**, ideal para PC modesta). Reporte:
     `razonamiento: github` + llamada en vivo a `models.github.ai`.
   - `LLM_PROVIDER=foundry` → **Foundry Local** (modelos de Foundry en tu máquina,
     offline). Reporte: `razonamiento: foundry`.
   👉 **Guía paso a paso: [`SETUP-FOUNDRY-IQ.md`](./SETUP-FOUNDRY-IQ.md).**
2. **Foundry IQ retrieval (upgrade, requiere Azure)** — `RETRIEVER=foundryiq`
   conecta la memoria a una *knowledge base* real de Foundry IQ (abajo).

Cuando `RETRIEVER=foundryiq`, el agente **no** usa la memoria local: llama en vivo
al endpoint de **agentic retrieval** de una *knowledge base* de Foundry IQ
(contrato verificado, jun-2026):

```
POST https://<servicio>.search.windows.net/knowledgebases/<kb>/retrieve?api-version=2026-05-01-preview
Authorization: Bearer <token search.azure.com>      # o  api-key: <admin key>
{ "messages":[{"role":"user","content":[{"type":"text","text":"<proyecto + dimensiones>"}]}],
  "knowledgeSourceParams":[{"knowledgeSourceName":"<ks>","kind":"searchIndex",
     "includeReferences":true,"includeReferenceSourceData":true,"maxOutputDocuments":k}],
  "outputMode":"extractedData" }
```

Foundry IQ planea la consulta con un modelo, busca en sus *knowledge sources* y
devuelve grounding extractivo con `references[]`; mapeamos `references[].sourceData`
1:1 a nuestro `RetrievalHit`, así que **el resto del agente y la UI no cambian**
(`lib/retrieval.ts` → `FoundryIQRetriever`). Es viable con una **cuenta Azure
gratuita ($200 de crédito), SIN licencia Copilot**.

### Provisionar Foundry IQ en ~30 min (real, gratis)

```bash
# 1. Crea un servicio de Azure AI Search (free/basic tier) en el portal de Azure.
# 2. (Recomendado) crea un recurso de Azure OpenAI y despliega un modelo chat
#    (p.ej. gpt-4o-mini) — habilita el planeo agéntico de consultas de Foundry IQ.
# 3. En .env.local:
#    AZURE_SEARCH_ENDPOINT=https://TU-BUSQUEDA.search.windows.net
#    AZURE_SEARCH_API_KEY=<admin key>
#    AZURE_SEARCH_INDEX=company-memory
#    FOUNDRY_KS_NAME=company-memory-ks
#    FOUNDRY_KB_NAME=company-memory-kb
#    AZURE_OPENAI_ENDPOINT=...  AZURE_OPENAI_API_KEY=...  AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
# 4. Provisiona índice + knowledge source + knowledge base de Foundry IQ:
npm run seed:foundryiq
# 5. Activa el recuperador real y reinicia:
#    RETRIEVER=foundryiq
npm run dev
```

A partir de ahí, cada pre-mortem consulta **Foundry IQ en vivo**; el campo
`memoria:` del reporte muestra `foundryiq`. Para razonamiento 100% real, además
pon `LLM_PROVIDER=azure` con ese mismo Azure OpenAI (o `LLM_PROVIDER=github`,
gratis): así **retrieval y razonamiento** son reales de punta a punta.

### Implementaciones del `MemoryRetriever` (interfaz única)

El tipo de retorno (`RetrievalHit`) es **espejo del hit del Copilot Retrieval
API** (`webUrl`, `extracts[].text` + `relevanceScore`, `resourceType`,
`sensitivityLabel`), así que cambiar de un origen a otro es un *swap*, no una
reescritura:

| Implementación      | Estado | Qué hace |
|---------------------|--------|----------|
| `FoundryIQRetriever`| ✅ **integración IQ** | **Microsoft Foundry IQ** real: agentic retrieval sobre una knowledge base (`/knowledgebases/{kb}/retrieve`). `npm run seed:foundryiq` → `RETRIEVER=foundryiq`. |
| `AzureSearchRetriever`| ✅ real (fallback) | Azure AI Search clásico (el motor de Foundry IQ, expuesto directo). Solo necesita el servicio de Search, sin Azure OpenAI. `npm run seed:azure` → `RETRIEVER=azuresearch`. |
| `SyntheticRetriever`| ✅ default offline | Memoria local; TF-IDF + solapamiento de dimensiones. Corre sin nube, para demo out-of-the-box. |
| `WorkIQRetriever`   | 🔌 stub | Copilot Retrieval API real (auth delegada/OBO; requiere licencia M365 Copilot, REST GA 16-jun-2026). Mismo contrato → *drop-in*. |

> Nota de stack: el **Microsoft Agent Framework (MAF)** GA es **Python/.NET
> únicamente — no hay SDK de TypeScript**. Esta app Next.js implementa el
> razonamiento multi-paso propio e invoca **Foundry IQ por REST**; es un agente
> de razonamiento legítimo sin depender del SDK de MAF.
>
> Las superficies de Foundry IQ / Work IQ se mueven rápido; si una api-version
> cambia, confirma endpoint y versión en Microsoft Learn (`agentic-retrieval`).

---

## Nivel producción (no solo demo)

El sistema está endurecido para operarse de verdad:

- **Historial persistente con permalinks** — cada pre-mortem queda guardado
  (`/informes`, `/informe/{id}`, API en `/api/reports`). Un pre-mortem que nadie
  relee no previene nada: el registro queda para contrastar contra la realidad.
- **Memoria institucional VIVA** — `POST /api/memory` agrega casos en runtime,
  y `POST /api/memory/import` importa postmortems masivamente desde **CSV**
  (validación fila a fila con errores por campo; listas separadas por `|`)
  (validados campo a campo contra las etiquetas del perfilador); el índice
  TF-IDF se reconstruye automáticamente y el caso nuevo es recuperable **en el
  siguiente request**. La persistencia usa un `DocumentStore` con adaptador de
  archivos (escritura atómica) intercambiable por Azure Cosmos DB / Table
  Storage sin tocar el resto.
- **Seguridad** — auth por API key (`API_KEY` → exige `x-api-key`/Bearer en
  endpoints de escritura, cómputo y MCP), rate limiting token-bucket por IP
  (`RATE_LIMIT_PER_MIN`), validación de entrada con errores por campo, ids a
  prueba de path traversal y headers de seguridad (nosniff, DENY, referrer).
- **Observabilidad** — logs estructurados JSON por línea, `/api/health` con
  checks reales (memoria cargada, store escribible, config) para probes de
  Kubernetes/App Service, y `/api/metrics` en formato Prometheus.
- **Calidad** — 22 tests unitarios (`npm test`, runner nativo de Node + tsx)
  sobre similitud, perfilado, gaps, validación, store y el agente completo
  (incluye determinismo y la regla "no inventa"), además del eval de
  razonamiento (`npm run eval`).
- **Despliegue** — `Dockerfile` multi-stage (build standalone de Next, usuario
  sin privilegios, HEALTHCHECK), `docker-compose.yml` con volumen de datos, y
  CI de GitHub Actions que corre typecheck → tests → build → eval.
- **Escala** — caché LRU por contenido (`X-Cache: HIT/MISS`; la clave incluye
  la versión de la memoria viva, así que agregar un caso invalida lo cacheado),
  análisis **batch en paralelo** (`POST /api/premortem/batch`, hasta 10
  proyectos) con UI de triage en `/portafolio`, y **profundidad configurable**
  (`depth: rapido | estandar | profundo` → 3/6/10 riesgos) en API y UI.
- **Integración saliente** — `WEBHOOK_URL` notifica cada informe generado con
  un POST JSON compatible con los incoming webhooks de **Microsoft Teams** y
  Slack (resumen + permalink), fire-and-forget con timeout.

```bash
npm test          # tests unitarios (22)
npm run eval      # evaluación del razonamiento (golden set 8/8)
docker compose up # producción en contenedor con volumen persistente
```

## El agente como herramienta de otros agentes (MCP)

Work IQ publica su API en preview por los protocolos **A2A y MCP**; este agente
habla el mismo idioma. El endpoint **`POST /api/mcp`** implementa MCP
(JSON-RPC 2.0, transporte Streamable HTTP stateless): cualquier cliente MCP
— Copilot Studio, Claude, VS Code — puede descubrir la herramienta `premortem`
e invocarla, recibiendo el reporte como texto **y** como `structuredContent`
(dictamen, riesgos, preguntas, puntos ciegos y traza).

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"premortem","arguments":{"description":"Vamos a lanzar una wallet móvil contrarreloj…"}}}'
```

## Stack

- **Next.js 14 (App Router) + TypeScript** — un solo app full-stack (UI + API + MCP).
- **Recuperación híbrida**: similitud **semántica densa** (embeddings reales de un
  modelo de Foundry, `RETRIEVER=embeddings`) **+ solapamiento de 4 dimensiones de
  negocio**. Cae a **TF-IDF** determinista si no hay red — el demo nunca se rompe.
- **LLM conmutable por env**: **`github`** (GitHub Models — catálogo de
  **Microsoft Foundry**, inferencia gratis con un token de GitHub),
  **`foundry`** (Foundry Local, modelo de Foundry on-device), `azure` /
  `openai` / `anthropic`, `ollama` (offline) y `stub` (determinista, default).
  La UI muestra el **estado real del motor** (modelo, activo, cuota restante)
  en `/api/llm-status`. El demo corre out-of-the-box.
- **UI bilingüe (ES/EN)** + reloj con la zona horaria real del visitante. El
  contenido del informe se genera en español (idioma del archivo institucional).
- **Movimiento**: `framer-motion` (reveals por scroll, parallax del hero,
  contadores, gráficos que se trazan solos) + `lenis` (scroll inercial suave).
  Todo respeta `prefers-reduced-motion`.

## Estructura del proyecto

```
.
├── app/
│   ├── page.tsx               # UI: pegar descripción → reporte con evidencia
│   ├── api/premortem/route.ts # endpoint del agente (persiste cada informe)
│   ├── api/mcp/route.ts       # el agente expuesto vía MCP (JSON-RPC, streamable HTTP)
│   ├── api/reports/           # historial de informes (lista + detalle + borrado)
│   ├── api/memory/route.ts    # memoria viva: stats + agregar casos en runtime
│   ├── api/health/route.ts    # health check con verificaciones reales
│   ├── api/metrics/route.ts   # métricas en formato Prometheus
│   ├── case/[id]/page.tsx     # abrir y verificar un caso de la memoria
│   ├── memoria/               # archivo navegable de toda la memoria (búsqueda + filtros)
│   ├── informes/page.tsx      # historial de pre-mortems persistidos
│   └── informe/[id]/page.tsx  # permalink de un informe guardado
├── components/
│   ├── Report.tsx             # el reporte completo (lo usan / e /informe/[id])
│   ├── SimViz.tsx             # gráficos SVG de la simulación (se trazan solos al entrar)
│   ├── RiskMatrix.tsx         # matriz severidad × confianza calibrada (SVG propio)
│   └── motion.tsx             # kit de movimiento: Lenis + reveals + contadores + parallax
├── lib/
│   ├── types.ts               # tipos (RetrievalHit modelado sobre Copilot Retrieval API)
│   ├── textsim.ts             # TF-IDF + coseno (sin deps)
│   ├── profile.ts             # perfilado heurístico (4 dimensiones)
│   ├── llm.ts                 # ReasoningLLM: stub + OpenAI/Azure/GitHub/Ollama/Anthropic
│   ├── retrieval.ts           # MemoryRetriever: synthetic + AzureSearch(Foundry IQ) + WorkIQ(stub)
│   ├── agent.ts               # orquestación del razonamiento multi-paso + traza auditable
│   ├── gaps.ts                # conciencia de incertidumbre: qué preguntaría el agente
│   ├── coverage.ts            # honestidad epistémica: puntos ciegos de la memoria
│   ├── simulation.ts          # proyección a 10 años anclada a los riesgos derivados
│   ├── external.ts            # "ya lo intentaron": fracasos públicos con fuente
│   ├── store.ts               # DocumentStore: persistencia con adaptador (FileStore atómico)
│   ├── memorystore.ts         # memoria viva: seed + casos agregados, con versionado
│   ├── validate.ts            # validación de entrada con errores por campo
│   ├── guard.ts               # auth por API key + rate limiting token-bucket
│   ├── logger.ts              # logs estructurados JSON + contadores para /api/metrics
│   └── memory/
│       ├── company_memory.json    # memoria sembrada de la empresa (30 casos)
│       └── external_failures.json # fracasos públicos reales (con fuente verificable)
├── tests/                     # 22 tests unitarios (node:test + tsx)
├── scripts/
│   ├── eval.mjs               # harness de evaluación: golden set + integridad + calibración
│   └── seed-azure-search.mjs  # sube la memoria a un índice de Azure AI Search
├── Dockerfile                 # imagen multi-stage (standalone, non-root, healthcheck)
├── docker-compose.yml         # despliegue con volumen de datos persistente
├── .github/workflows/ci.yml   # CI: typecheck → tests → build → eval
├── .env.example
└── README.md
```

## Cómo correr

```bash
npm install
cp .env.example .env.local   # opcional: con los defaults corre sin API key
npm run dev
# abre http://localhost:3000
```

1. Pega la descripción de tu proyecto (o pulsa **Cargar ejemplo**).
2. Pulsa **Generar pre-mortem**.
3. Lee los riesgos rankeados; abre cada **caso de evidencia** para verificar.

### Activar un LLM real (opcional)

En `.env.local`:

```env
# GitHub Models — GRATIS con un token de GitHub (la vía más fácil de probar LLM real)
LLM_PROVIDER=github
GITHUB_TOKEN=github_pat_...        # PAT con permiso "Models: read"
GITHUB_MODEL=openai/gpt-4o-mini

# o Azure OpenAI (mejor narrativa Microsoft)
LLM_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://TU-RECURSO.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# u OpenAI / Anthropic / Ollama local
LLM_PROVIDER=openai      # OPENAI_API_KEY=sk-...
LLM_PROVIDER=anthropic   # ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=ollama      # OLLAMA_MODEL=llama3.2 (offline)
```

Si falta la key, el sistema cae automáticamente al `stub` (nunca se rompe).

---

## Qué es real y qué es de ejemplo (honestidad)

- ✅ **Real**: el razonamiento multi-paso, el retrieval, la evaluación, la
  persistencia, el endpoint MCP, las APIs y la **integración con Foundry IQ**
  (`RETRIEVER=foundryiq` → el agente consulta una knowledge base real de Foundry
  IQ; ver el runbook arriba). Con `LLM_PROVIDER=azure`/`github`, el razonamiento
  también usa un LLM real.
- 🧪 **De ejemplo (semilla)**: los **30 casos de la memoria** son un corpus
  curado para demostrar el patrón. No son confidenciales ni inventan resultados
  de terceros. Esos mismos 30 casos son los que `npm run seed:foundryiq` carga en
  Foundry IQ — la diferencia es que entonces viven y se recuperan en la nube real.
- ✅ **Datos públicos verificables**: los 32 fracasos de empresas reales
  (`external_failures.json`) llevan fuente citada cada uno.

## Limitaciones (MVP honesto)

- El default `synthetic` corre sin nube para que el demo arranque en frío; la
  memoria real se activa con `RETRIEVER=foundryiq` (Foundry IQ) tras el seed.
- La recuperación local es TF-IDF + dimensiones (no embeddings densos): suficiente
  para decenas/cientos de registros. Bajo Foundry IQ, la búsqueda la hace Azure
  AI Search (semantic ranker) sin tocar el agente.
- El `stub` razona por plantilla determinista; un LLM real (Azure OpenAI / GitHub
  Models) mejora el matiz del mapeo manteniendo la regla de no inventar.

## Licencia

MIT.
