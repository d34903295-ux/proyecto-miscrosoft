// ─────────────────────────────────────────────────────────────
// "Interrogá la evidencia": preguntas y respuestas GROUNDED sobre un caso de la
// memoria. Misma regla que el agente — "recuerda, no inventa": el modelo de
// Microsoft Foundry responde ESTRICTAMENTE con lo que dice el expediente; si la
// respuesta no está ahí, devuelve "No consta en el expediente."
//
// Reutiliza el mismo proveedor que el razonamiento (LLM_PROVIDER). Sin modelo
// (stub) cae a una respuesta extractiva determinista desde los campos del caso.
// ─────────────────────────────────────────────────────────────

import type { PastProjectRecord } from "./types";
import { recordLLMCall } from "./llmstatus";
import { tokenize } from "./textsim";

export interface AskResult {
  answer: string;
  provider: string;
  grounded: boolean; // true = vino de un modelo real; false = extractivo (stub)
}

const NOT_IN_FILE = "No consta en el expediente.";

function caseContext(r: PastProjectRecord): string {
  return [
    `Nombre: ${r.name} (${r.year})`,
    `Tipo de cliente: ${r.clientType}`,
    `Tecnología: ${r.tech.join(", ")}`,
    `Apuesta de mercado: ${r.marketBet}`,
    `Dinámica de equipo: ${r.teamDynamics}`,
    `Descripción: ${r.description}`,
    `Apuesta/supuesto central: ${r.assumption}`,
    `Qué salió mal: ${r.whatWentWrong}`,
    `Señales ignoradas: ${r.ignoredSignals.join("; ")}`,
    `Resultado: ${r.outcome}`,
    `Severidad: ${r.severity}/5`,
    `Categoría de fallo: ${r.failureCategory}`,
    `Lección/mitigación: ${r.mitigation}`,
  ].join("\n");
}

/** Respuesta extractiva determinista (sin modelo): elige el/los campo(s) del
 *  expediente con mayor solapamiento de términos con la pregunta. */
function extractiveAnswer(r: PastProjectRecord, question: string): string {
  const q = new Set(tokenize(question));
  if (q.size === 0) return NOT_IN_FILE;
  const fields: { label: string; text: string }[] = [
    { label: "Qué salió mal", text: r.whatWentWrong },
    { label: "Apuesta", text: r.assumption },
    { label: "Señales ignoradas", text: r.ignoredSignals.join("; ") },
    { label: "Resultado", text: r.outcome },
    { label: "Lección", text: r.mitigation },
    { label: "Descripción", text: r.description },
  ];
  let best = { score: 0, label: "", text: "" };
  for (const f of fields) {
    const ft = new Set(tokenize(f.text));
    let overlap = 0;
    for (const t of q) if (ft.has(t)) overlap += 1;
    if (overlap > best.score) best = { score: overlap, label: f.label, text: f.text };
  }
  if (best.score === 0) return NOT_IN_FILE;
  return `${best.text} (${best.label}, expediente ${r.id})`;
}

export function openAICompatTarget():
  | { url: string; headers: Record<string, string>; model: string; provider: string }
  | null {
  const provider = (process.env.LLM_PROVIDER ?? "stub").toLowerCase();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider === "github" && process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    return {
      url: "https://models.github.ai/inference/chat/completions",
      headers,
      model: process.env.GITHUB_MODEL ?? "openai/gpt-4o-mini",
      provider,
    };
  }
  if (provider === "foundry") {
    const base = (process.env.FOUNDRY_LOCAL_ENDPOINT ?? "http://localhost:5272").replace(/\/(v1\/?)?$/, "");
    return { url: `${base}/v1/chat/completions`, headers, model: process.env.FOUNDRY_LOCAL_MODEL ?? "qwen2.5-0.5b", provider };
  }
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.OPENAI_API_KEY}`;
    return { url: "https://api.openai.com/v1/chat/completions", headers, model: process.env.OPENAI_MODEL ?? "gpt-4o-mini", provider };
  }
  if (
    provider === "azure" &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_DEPLOYMENT
  ) {
    const ep = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, "");
    const dep = process.env.AZURE_OPENAI_DEPLOYMENT;
    const ver = process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview";
    headers["api-key"] = process.env.AZURE_OPENAI_API_KEY;
    return { url: `${ep}/openai/deployments/${dep}/chat/completions?api-version=${ver}`, headers, model: dep, provider };
  }
  return null;
}

export async function answerFromCase(r: PastProjectRecord, question: string): Promise<AskResult> {
  const provider = (process.env.LLM_PROVIDER ?? "stub").toLowerCase();
  const system =
    "Eres el archivista de la memoria institucional. Respondes preguntas sobre UN expediente " +
    "de un proyecto pasado. REGLA ABSOLUTA: usa SOLO la información del expediente provisto. " +
    `Si la respuesta no está en el expediente, responde EXACTAMENTE: "${NOT_IN_FILE}". ` +
    "No inventes hechos, cifras ni causas que no estén escritas. Responde en español, 1-3 frases.";
  const user = `EXPEDIENTE (única fuente permitida):\n${caseContext(r)}\n\nPREGUNTA: ${question.slice(0, 500)}`;

  // Anthropic (formato propio).
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
          max_tokens: 300,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = (data.content ?? []).map((b: any) => b.text ?? "").join("").trim();
      recordLLMCall("anthropic", process.env.ANTHROPIC_MODEL ?? "anthropic", res.headers, true);
      return { answer: text || NOT_IN_FILE, provider, grounded: true };
    } catch (e: any) {
      recordLLMCall("anthropic", "anthropic", null, false, e?.message);
      return { answer: extractiveAnswer(r, question), provider: "stub", grounded: false };
    }
  }

  const target = openAICompatTarget();
  if (target) {
    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify({
          model: target.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const text = String(data.choices?.[0]?.message?.content ?? "").trim();
      recordLLMCall(target.provider, target.model, res.headers, true);
      return { answer: text || NOT_IN_FILE, provider: target.provider, grounded: true };
    } catch (e: any) {
      recordLLMCall(target.provider, target.model, null, false, e?.message);
      return { answer: extractiveAnswer(r, question), provider: "stub", grounded: false };
    }
  }

  // Sin modelo configurado: extractivo determinista.
  return { answer: extractiveAnswer(r, question), provider: "stub", grounded: false };
}
