# 🪦 Pre-Mortem Institucional

> **It doesn't predict failure. It _remembers_ it.**

A reasoning agent for the **Microsoft Agents League** · **Reasoning Agents** track.

**🌐 [Live demo](https://fullpremortem.vercel.app/) · 🎥 [Video demo](https://youtu.be/XyVPeMP0FBs) · 📖 [How it works (deep dive)](./COMO-FUNCIONA.md)**

Before you launch a project, this agent searches your company's institutional memory
for similar **past projects that failed**, and derives how _yours_ is likely to fail —
**every risk anchored to a real, openable case** (rule: _recall, don't invent_). It
reasons on a **Microsoft Foundry-hosted model**, refutes its own findings, and
**measures** its own reasoning quality instead of just claiming it.

---

## Why it stands out

- 🧠 **Reasoning is measured, not claimed** — `npm run eval` scores a golden set: recall **8/8**, evidence integrity, calibration, determinism.
- 🔍 **Recall, don't invent** — every risk cites a real, openable case; the agent then **refutes itself** (anti-confirmation pass) and recalibrates its confidence.
- 🤖 **Microsoft Foundry, live** — reasoning runs on a Foundry model (GitHub Models); the agent is also exposed as an **MCP tool** other agents can call.
- 🏭 **Production-grade** — auth + rate-limit, `/api/health` + Prometheus metrics, Docker, CI, **22 tests**, hybrid embedding retrieval, bilingual EN/ES UI.

---

## How it works — 7 auditable steps

1. **Profile** — a Foundry model turns your idea into structure: client type, technology, market bet, team dynamics.
2. **Retrieve** — hybrid: dense **embeddings** (meaning) + overlap of the 4 business dimensions.
3. **Deduplicate** — one risk per failure type; never the same risk twice.
4. **Map** — each real case is mapped onto your project, using **only** what the case file says (no invention).
5. **Refute** — a skeptical second pass argues against each risk and recalibrates confidence.
6. **Rank** — relevance × calibrated confidence × historical severity.
7. **Self-assess** — what's missing, where memory is blind → board vote, expected cost, point of no return, and a 3-scenario survival simulation.

Every step is logged in an auditable **reasoning trace**.

---

## How it maps to the judging rubric

| Criterion | Weight | Where to see it |
|---|---|---|
| **Accuracy & Relevance** | 20% | `npm run eval` → recall **8/8**; every risk cites a verifiable, openable case. |
| **Reasoning & Multi-step** | 20% | 7 auditable steps + **anti-confirmation** self-refutation + visible trace. |
| **Creativity & Originality** | 15% | "Recall, don't predict"; simulated board, "show me my funeral", point of no return, **3D world**, MCP endpoint. |
| **User Experience & Presentation** | 15% | "Terminal Forense" design, **bilingual EN/ES**, responsive, live engine-status panel, explainer video. |
| **Reliability & Safety** | 20% | Recall-don't-invent (anti-hallucination, verifiable); auth + rate-limit; **22 tests** + CI; 429 retry + model fallback; `/api/health`. |
| **Community vote** | 10% | Share on the Agents League Discord. |

---

## Microsoft Foundry integration

- **Reasoning** runs on a **Foundry-hosted model** via **GitHub Models** (`LLM_PROVIDER=github`) — the report footer shows `reasoning: github`, with live calls to `models.github.ai`. Also works fully offline with **Foundry Local** (`LLM_PROVIDER=foundry`).
- **Retrieval** can upgrade to **Foundry IQ** agentic retrieval (`RETRIEVER=foundryiq` → `npm run seed:foundryiq`). Full guide: **[`SETUP-FOUNDRY-IQ.md`](./SETUP-FOUNDRY-IQ.md)**.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:3000 — runs out of the box (deterministic stub, no keys)
npm test         # 22 unit tests
npm run eval     # golden-set eval (run `npm run dev` first) → recall 8/8
```

Use a **real Foundry model** (free, no card): set in `.env.local`

```env
LLM_PROVIDER=github
GITHUB_TOKEN=github_pat_...   # a GitHub token with "Models: read"
GITHUB_MODEL=openai/gpt-4o-mini
RETRIEVER=embeddings          # semantic retrieval with Foundry embeddings
```

---

## Two ways to call the agent

- **REST** (web / humans): `POST /api/premortem`, `GET /api/reports`, …
- **MCP** (other AI agents): `POST /api/mcp` — JSON-RPC 2.0 exposing the `premortem` tool, so Copilot Studio, VS Code or Claude can discover and invoke it.

---

## What's real vs. seed (honesty)

- ✅ **Real**: the reasoning, hybrid retrieval, eval harness, persistence, APIs, MCP endpoint, and the **live Foundry model** (`reasoning: github`).
- 🧪 **Seed**: the 30 internal-memory cases are an **anonymized synthetic seed** (codenames like `PRJ-2023-CYGNUS`) that demonstrate the pattern — not claims about public companies.
- ✅ **Verifiable public data**: 32 real company failures (Webvan, Quibi, Theranos…) with cited sources, mapped on the **3D world**.

---

## Stack

Next.js 14 (App Router) · TypeScript · React 18 · framer-motion · Three.js (3D world) ·
GitHub Models / Foundry Local / Azure OpenAI (reasoning + embeddings) · hybrid embedding
+ business-dimension retrieval (TF-IDF fallback) · file persistence (→ Cosmos DB) ·
Docker · GitHub Actions · Vercel.

## License

MIT.
