# 🪦 Cómo funciona — Pre-Mortem Institucional

> **EN — TL;DR for judges:** A reasoning agent that **doesn't predict — it remembers**.
> You describe a project you're about to launch; the agent retrieves the most similar
> *past* projects that failed from the company's institutional memory, and derives how
> *this* one is likely to fail — **every risk anchored to a real, openable case** (rule:
> *recall, don't invent*). It then **refutes its own findings** (anti-confirmation pass),
> says **what it would ask**, admits **where its memory is blind**, exposes a full
> **reasoning trace**, and is scored by a **golden-set eval** (recall 8/8). Reasoning
> runs on a **Microsoft Foundry** model (GitHub Models). Retrieval is **hybrid dense
> embeddings + structured business-dimension matching**, not keyword similarity.

---

## 1. El problema

La mayoría de los proyectos no fracasan por razones nuevas: fracasan por las **mismas
razones** por las que ya fracasaron otros antes, dentro de la misma empresa. Ese
conocimiento existe pero está disperso y nadie lo recuerda al decidir. Este agente
convierte la memoria institucional en una **advertencia accionable y trazable a
evidencia**, justo antes de lanzar.

## 2. El núcleo (lo "core" — esto es lo que importa)

```
Describes tu proyecto  →  el agente RECUERDA casos reales parecidos que fracasaron
                       →  deriva tus riesgos, cada uno ANCLADO a un caso abrible
                       →  se REFUTA a sí mismo y recalibra su confianza
                       →  reporte trazable: abre el caso y verifica
```

Todo lo demás (mundo 3D, consejo simulado, simulación a 10 años, MCP, métricas) es
**valor añadido sobre ese núcleo**. Si solo miras una cosa, mira un **riesgo y su
Exhibit A**: ábrelo y comprueba que el riesgo sale literalmente de ese caso real.

## 3. La regla de oro: «recuerda, no inventa»

- El **"recordar" lo hace el RETRIEVAL** (determinista), no el modelo de lenguaje.
- El modelo de Foundry solo hace 2 cosas: (a) **perfilar** tu descripción en etiquetas,
  y (b) **redactar el mapeo** de un caso real ya recuperado a tu proyecto.
- El *prompt del sistema le PROHÍBE* introducir hechos que no estén en el caso
  (`lib/llm.ts`). No navega, no investiga, no inventa riesgos.
- Cada riesgo trae un **link al expediente completo** + las **dimensiones que
  coincidieron**. El `npm run eval` **verifica automáticamente** que cada riesgo cita un
  caso real, abrible y presente en los inspeccionados → **integridad de evidencia**.

## 4. Razonamiento multi-paso (7 pasos auditables) — `lib/agent.ts`

| # | Paso | Qué hace |
|---|------|----------|
| 1 | **Perfilar** | Modelo de Foundry → tipo de cliente · tecnología · apuesta de mercado · dinámica de equipo |
| 2 | **Recuperar** | Los casos pasados más parecidos (retrieval híbrido, ver §5) |
| 3 | **Deduplicar** | Un riesgo por categoría de fallo (no repetir el mismo modo) |
| 4 | **Mapear** | Por cada caso: extraer el fallo y trasladarlo a tu proyecto, anclado a su evidencia |
| 5 | **Refutar** ⭐ | Paso **anti-confirmación**: un segundo razonamiento escéptico intenta tumbar cada riesgo y **recalibra la confianza** (verás "conf 50% ← antes 80%") |
| 6 | **Rankear** | relevancia × confianza calibrada × severidad histórica |
| 7 | **Autoevaluar** | Qué info te **falta** (preguntas) y dónde la memoria está **ciega** (cobertura) |

Cada paso queda en una **traza auditable** (qué decidió + cuánto tardó), visible al
final del reporte. El razonamiento es **transparente y medible**, no una caja negra.

## 5. Recuperación híbrida (no es "similitud simple") — `lib/retrieval.ts`

El emparejamiento combina **dos señales**:

- **55% — similitud SEMÁNTICA densa**: embeddings reales de un modelo de **Microsoft
  Foundry** (`RETRIEVER=embeddings`, vía GitHub Models). Empareja por **significado**,
  no por palabras compartidas. (`lib/embeddings.ts`).
- **45% — solapamiento de 4 dimensiones de negocio**: tipo de cliente, tecnología,
  apuesta de mercado, dinámica de equipo. Empareja por **estructura del negocio**.

La UI muestra **qué dimensiones coincidieron** en cada evidencia, así el juez ve
*por qué* se eligió ese caso. Degrada con gracia: sin red/cuota, cae a **TF-IDF
determinista** y el demo nunca se rompe. Hay además rutas reales a **Foundry IQ /
Azure AI Search** (`RETRIEVER=foundryiq` / `azuresearch`) con el mismo contrato.

## 6. Integración con Microsoft Foundry (requisito del hackathon)

- **Razonamiento**: corre sobre un **modelo alojado en Microsoft Foundry** vía
  **GitHub Models** (`LLM_PROVIDER=github`). El pie del reporte muestra
  `razonamiento: github` y la llamada sale en vivo a `models.github.ai` — ese es el
  backend en vivo que pidió Microsoft. Alternativa local: **Foundry Local**
  (`LLM_PROVIDER=foundry`).
- **Embeddings**: la búsqueda semántica usa **otro modelo de Foundry**
  (`text-embedding-3-small`).
- **Upgrade real**: `RETRIEVER=foundryiq` conecta la memoria a una **knowledge base de
  Foundry IQ** (agentic retrieval, `POST /knowledgebases/{kb}/retrieve`). Ver
  `SETUP-FOUNDRY-IQ.md`.

## 7. Dos formas de invocar al agente: REST y MCP

- **REST API** (humanos / web): `POST /api/premortem`, `GET /api/reports`, etc.
  Es lo que usa la propia interfaz. (`app/api/premortem/route.ts`)
- **MCP** (otros agentes de IA): `POST /api/mcp` — **JSON-RPC 2.0**, transporte
  Streamable HTTP. Expone la herramienta `premortem` con `initialize`, `tools/list`,
  `tools/call`. Cualquier cliente MCP (Copilot Studio, Claude, VS Code) lo **descubre
  e invoca como herramienta**. (`app/api/mcp/route.ts`) — el mismo protocolo por el
  que Microsoft Work IQ publica su API.

```bash
curl -X POST https://TU-APP/api/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"premortem","arguments":{"description":"lanzar wallet móvil contrarreloj con equipo nuevo"}}}'
```

## 8. Lo que produce el reporte

Dictamen forense (índice 0-100) · riesgos rankeados con evidencia abrible ·
**contraanálisis** por riesgo · **matriz de riesgo** (SVG) · **consejo de administración
simulado** (CTO/CFO/CMO/COO votan "¿invertirías $1M?") · **coste esperado** ·
**punto de no retorno** · **simulación a 10 años** · **"muéstrame mi funeral"** ·
preguntas pendientes · puntos ciegos · "ya lo intentaron" (fracasos públicos reales con
fuente) · **transparencia**: todos los casos inspeccionados (incluidos y descartados).

## 9. Nivel producción

REST + **MCP** · auth por API key + rate limiting · `/api/health` + `/api/metrics`
(Prometheus) · **panel de estado del motor en vivo** (`/api/llm-status`) · caché LRU ·
batch en paralelo · **22 tests** + **eval golden-set** (recall **8/8**, integridad de
evidencia, calibración, determinismo) · **Docker** + **CI** · UI **bilingüe ES/EN** +
reloj local · PWA · accesibilidad WCAG AA.

## 10. Cómo verificarlo (para el juez)

```bash
npm install
LLM_PROVIDER=github GITHUB_TOKEN=*** RETRIEVER=embeddings npm run dev   # modelo Foundry real
npm test        # 22/22
npm run eval    # recall 8/8 + integridad de evidencia (con el server corriendo)
```

1. Genera un pre-mortem → abre el **Exhibit A** de un riesgo: la cita sale del caso real.
2. Mira el **contraanálisis**: la confianza bajó tras refutar → no es marketing.
3. Abre la **traza de razonamiento** (7 pasos) y los **casos inspeccionados**.
4. Pie del reporte: `razonamiento: github` · `memoria: embeddings` → backend Foundry en vivo.

## 11. Stack

Next.js 14 (App Router) · TypeScript · React 18 · framer-motion + lenis (motion) ·
Three.js / react-three-fiber (globo 3D) · GitHub Models / Foundry Local / Azure OpenAI
(razonamiento + embeddings) · retrieval híbrido (embeddings densos + dimensiones, TF-IDF
de respaldo) · FileStore (→ Cosmos DB) · Docker · GitHub Actions · Vercel.

---

**En una frase:** *un agente de razonamiento que convierte la memoria institucional en
una advertencia trazable a evidencia antes de lanzar un proyecto — razonando con un
modelo de Microsoft Foundry, y midiéndose a sí mismo en vez de solo afirmar.*
