# 🪦 Pre-Mortem Institucional — Submission

**Microsoft Agents League · Track: Reasoning Agents · v1.0.0**

> **EN —** A reasoning agent that doesn't predict: it *remembers*. Before you
> launch a project, it searches your company's institutional memory for similar
> past projects that failed, derives the likely failure modes — **each one
> anchored to a real, openable case** (rule: *recall, don't invent*) — then
> tries to **refute its own findings**, tells you **what it would ask**, admits
> **where its memory is blind**, and exposes its full **reasoning trace**.
> Reasoning quality is **measured, not claimed**: a golden-set eval harness
> scores recall (**8/8**), evidence integrity, calibration and determinism.

## Por qué encaja en Reasoning Agents

| Capacidad de razonamiento | Dónde verla |
| --- | --- |
| Razonamiento multi-paso (7 pasos) | Traza auditable al final de cada reporte |
| Anti-confirmación (se refuta a sí mismo) | Contraanálisis por riesgo + confianza recalibrada |
| Grounding estricto ("recuerda, no inventa") | Cada riesgo cita un caso abrible; eval verifica integridad |
| Conciencia de incertidumbre | "Lo que el agente preguntaría" + puntos ciegos de la memoria |
| Razonamiento medible | `npm run eval` → recuerdo 8/8, calibración, determinismo |
| Agente interoperable (A2A) | Endpoint **MCP** (`POST /api/mcp`) — mismo protocolo que Work IQ |

## Demo (2 minutos)

```bash
npm install && npm run dev   # corre sin API keys (motor stub determinista)
```

1. http://localhost:3000 → ejemplo **chatbot IA soporte** → `[ ejecutar pre-mortem ]`
2. `// portafolio` → "cargar ejemplo" → 3 proyectos rankeados por riesgo en paralelo
3. `npm test` (22 ✓) · `npm run eval` (8/8) — el razonamiento se mide

## Arquitectura en una línea

Next.js 14 full-stack · retrieval TF-IDF propio sobre 30 casos (interfaz espejo
del **Copilot Retrieval API** → swap directo a **Foundry IQ / Azure AI Search**,
ya implementado, o Work IQ) · LLM conmutable (stub/OpenAI/Azure/GitHub
Models/Ollama/Anthropic) · memoria viva con persistencia · auth + rate limit +
health + métricas Prometheus · Docker + CI.

## Qué es real y qué es sintético (honestidad)

- ✅ Real: todo el razonamiento, retrieval, eval, persistencia, MCP, APIs.
- 🧪 Sintético: los 30 casos de memoria (Work IQ exige licencia Copilot y su
  REST API es GA el 16-jun — después del cierre). El `AzureSearchRetriever`
  (Foundry IQ) está implementado para datos reales: `npm run seed:azure`.

## Extras

- Video promo (HyperFrames, `video/`): `npm run video:preview`; el MP4 se
  renderiza con el workflow `render-video` de GitHub Actions.
- PWA instalable · dictado por voz · diseño "Terminal Forense" auditado WCAG AA.
