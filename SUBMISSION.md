# 🪦 Pre-Mortem Institucional — Submission

**Microsoft Agents League · Track: Reasoning Agents · v1.1.0**

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
| **Deliberación multiagente** | Consejo simulado (CTO/CFO/CMO/COO): "¿invertirías $1M?" — cada voto anclado a los riesgos de su área, decisión coherente con el dictamen |
| Impacto en dinero | Coste esperado por riesgo (probabilidad × impacto) y total |
| Condiciones accionables | **Punto de no retorno**: "si llegas al mes X sin resolver esto, fracaso >N%" (derivado de la curva de supervivencia) |
| Narrativa anclada | **"Muéstrame mi funeral"**: obituario del proyecto compuesto solo con los riesgos y la línea temporal |
| Memoria que aprende | Feedback "✓ ocurrió / ✗ no ocurrió" por riesgo → precisión histórica del agente |

## 🎥 Video demo

> **▶️ TODO antes de entregar:** pega aquí el enlace al video (2-3 min) —
> `🎥 Video: <URL de YouTube/Loom>`

## Demo (2 minutos)

```bash
npm install && npm run dev   # corre sin API keys (motor stub determinista)
```

1. http://localhost:3000 → ejemplo **chatbot IA soporte** → `[ ejecutar pre-mortem ]`
2. `// portafolio` → "cargar ejemplo" → 3 proyectos rankeados por riesgo en paralelo
3. `npm test` (22 ✓) · `npm run eval` (8/8) — el razonamiento se mide

## Microsoft IQ (requisito del hackathon): **Foundry**

Los jueces confirmaron que el mínimo es *"at least one Microsoft Foundry hosted
model"* con backend en vivo. Dos niveles, ambos implementados:

- **Modelo de Foundry (GRATIS, sin Azure):** `LLM_PROVIDER=foundry` → el agente
  razona con **Foundry Local** (modelos de Microsoft Foundry en la máquina). El
  reporte muestra `razonamiento: foundry` como prueba en vivo. Guía:
  `SETUP-FOUNDRY-IQ.md`.
- **Foundry IQ retrieval (upgrade, con Azure):** `RETRIEVER=foundryiq` → cada
  pre-mortem llama al *agentic retrieval* de una knowledge base de Foundry IQ
  (`POST /knowledgebases/{kb}/retrieve`), mapeando `references[].sourceData` →
  `RetrievalHit`. Provisión: `npm run seed:foundryiq`.

## Arquitectura en una línea

Next.js 14 full-stack · **Foundry IQ** (agentic retrieval) como memoria real,
con interfaz `MemoryRetriever` única (espejo del Copilot Retrieval API; fallbacks:
Azure AI Search, synthetic local, Work IQ stub) · LLM conmutable (stub/Azure
OpenAI/OpenAI/GitHub Models/Ollama/Anthropic) · memoria viva con persistencia ·
auth + rate limit + health + métricas Prometheus · Docker + CI.

## Qué es real y qué es de ejemplo (honestidad)

- ✅ Real: todo el razonamiento, retrieval, eval, persistencia, MCP, APIs, y la
  **integración con Foundry IQ** (`RETRIEVER=foundryiq`). Con `LLM_PROVIDER=azure`
  o `github`, el razonamiento también usa un LLM real.
- 🧪 De ejemplo: los 30 casos de memoria son un corpus semilla (no confidencial);
  `npm run seed:foundryiq` los carga en Foundry IQ real.
- ✅ Datos públicos verificables: 32 fracasos de empresas reales con fuente citada.

## Extras

- **Mundo 3D** (`/mundo`): globo terráqueo WebGL (Three.js) con las sedes
  REALES de las 32 empresas de la memoria externa — toca una luz ámbar y abre
  el expediente. Construido con los assets 3D del proyecto.
- **BYOK OpenRouter**: panel "configurar IA" en el frontend — el usuario pega
  su key (modo automático: OpenRouter elige el mejor modelo); la key vive solo
  en su navegador y viaja por header.
- Portafolio modo VC (orden de inversión) · timeline de la catástrofe ·
  webhook a Teams/Slack con la decisión del consejo.
- Video promo (HyperFrames, `video/`): `npm run video:preview`; el MP4 se
  renderiza con el workflow `render-video` de GitHub Actions.
- PWA instalable · dictado por voz · diseño "Terminal Forense" auditado WCAG AA.

## ✅ Checklist de reglas (Agents League)

| Requisito | Estado |
|---|---|
| Track elegido (Reasoning Agents) | ✅ |
| **Integra Microsoft Foundry** (modelo hosted) | ✅ `LLM_PROVIDER=foundry` (Foundry Local, gratis) · upgrade: `RETRIEVER=foundryiq` |
| Repositorio **público** | ⬜ **hazlo público antes de entregar** (GitHub → Settings → Visibility) |
| README presente | ✅ |
| 🎥 Video demo (2-3 min) | ⬜ **graba y pega el enlace arriba** |
| Sin información confidencial (Disclaimer) | ✅ sin secretos; solo placeholders; `.env*` en `.gitignore` |
| Código de conducta respetado | ✅ |
| Funcional y demoable | ✅ corre out-of-the-box (`npm run dev`) |

> Los dos ⬜ son acciones manuales tuyas en la plataforma/GitHub; el resto está en el repo.
