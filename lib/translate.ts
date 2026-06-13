// ─────────────────────────────────────────────────────────────
// Traducción del CONTENIDO del reporte al idioma elegido (en), usando el mismo
// modelo de Microsoft Foundry que el razonamiento. Una sola llamada batch.
//
// Principios:
//  - Solo traduce TEXTO LIBRE visible. NUNCA toca enums/keys usados por la lógica
//    o el CSS (level, stands, vote, invest, role, ids, números).
//  - Si no hay modelo o la traducción falla, devuelve el reporte INTACTO en
//    español y marca lang="es" → la UI se queda 100% en español (nunca mezcla).
// ─────────────────────────────────────────────────────────────

import type { PreMortemReport } from "./types";
import { openAICompatTarget } from "./chat";
import { recordLLMCall } from "./llmstatus";

export function translationAvailable(): boolean {
  return openAICompatTarget() !== null;
}

/** Traduce una lista de cadenas. Devuelve null si falla (→ se conserva español). */
async function translateBatch(strings: string[], target = "en"): Promise<string[] | null> {
  if (strings.length === 0) return [];
  const t = openAICompatTarget();
  if (!t) return null;

  const system =
    `You are a professional translator. Translate each value to natural, concise ${target === "en" ? "English" : target}. ` +
    "Keep proper nouns, company/product names, codes (like PRJ-2023-XYZ), numbers, currency and percentages EXACTLY as they are. " +
    "Preserve markdown/quotes. Return ONLY a valid JSON object mapping each input key to its translation, with the SAME keys. Do not add, remove or reorder keys.";
  const payload = Object.fromEntries(strings.map((s, i) => [String(i), s]));
  const user =
    "Translate the values of this JSON. Return a JSON object with identical keys:\n" +
    JSON.stringify(payload);

  try {
    const res = await fetch(t.url, {
      method: "POST",
      headers: t.headers,
      body: JSON.stringify({
        model: t.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      recordLLMCall(t.provider, t.model, res.headers, false, `translate HTTP ${res.status}`);
      return null;
    }
    recordLLMCall(t.provider, t.model, res.headers, true);
    const data = await res.json();
    const content = String(data.choices?.[0]?.message?.content ?? "");
    const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const obj = JSON.parse(cleaned);
    const out = strings.map((orig, i) => {
      const v = obj[String(i)];
      return typeof v === "string" && v.trim() ? v : orig;
    });
    return out;
  } catch {
    return null;
  }
}

/** Accesor get/set para una cadena dentro del reporte (traducción in-place). */
interface Slot {
  get: () => string;
  set: (v: string) => void;
}

function collectSlots(r: PreMortemReport): Slot[] {
  const slots: Slot[] = [];
  const push = (get: () => string, set: (v: string) => void) => {
    const v = get();
    if (typeof v === "string" && v.trim().length > 0) slots.push({ get, set });
  };

  // Dictamen
  push(() => r.verdict.headline, (v) => (r.verdict.headline = v));
  r.verdict.dominantThemes.forEach((_, i) =>
    push(() => r.verdict.dominantThemes[i], (v) => (r.verdict.dominantThemes[i] = v))
  );

  // Riesgos (texto libre; NO stands/level/categoría-enum, NO ids)
  r.risks.forEach((risk) => {
    push(() => risk.title, (v) => (risk.title = v));
    push(() => risk.failureMode, (v) => (risk.failureMode = v));
    push(() => risk.whyItAppliesHere, (v) => (risk.whyItAppliesHere = v));
    push(() => risk.mitigation, (v) => (risk.mitigation = v));
    risk.earlyWarningSignals.forEach((_, i) =>
      push(() => risk.earlyWarningSignals[i], (v) => (risk.earlyWarningSignals[i] = v))
    );
    push(() => risk.refutation.challenge, (v) => (risk.refutation.challenge = v));
    push(() => risk.evidence.extract, (v) => (risk.evidence.extract = v));
    push(() => risk.evidence.outcome, (v) => (risk.evidence.outcome = v));
  });

  // Consejo
  if (r.board) {
    push(() => r.board.reason, (v) => (r.board.reason = v));
    r.board.votes.forEach((vt) => {
      push(() => vt.argument, (v) => (vt.argument = v));
      push(() => vt.roleLabel, (v) => (vt.roleLabel = v));
    });
  }

  // Punto de no retorno
  if (r.pointOfNoReturn) {
    r.pointOfNoReturn.conditions.forEach((c) =>
      push(() => c.condition, (v) => (c.condition = v))
    );
  }

  // Funeral
  push(() => r.funeral, (v) => (r.funeral = v));

  // Simulación
  push(() => r.simulation.summary, (v) => (r.simulation.summary = v));

  // Gaps
  r.gaps.forEach((g) => {
    push(() => g.question, (v) => (g.question = v));
    push(() => g.why, (v) => (g.why = v));
    push(() => g.missing, (v) => (g.missing = v));
  });

  // Cobertura
  r.coverage.forEach((c) => push(() => c.value, (v) => (c.value = v)));

  // Inspeccionados (motivo)
  r.inspected.forEach((c) => push(() => c.reason, (v) => (c.reason = v)));

  // Fracasos externos (datos públicos reales en español → traducir display)
  r.externalFailures.forEach((f) => {
    push(() => f.idea, (v) => (f.idea = v));
    push(() => f.bet, (v) => (f.bet = v));
    push(() => f.whyFailed, (v) => (f.whyFailed = v));
    push(() => f.lesson, (v) => (f.lesson = v));
  });

  return slots;
}

/**
 * Traduce el reporte al idioma pedido si hay modelo. Devuelve el MISMO objeto
 * (mutado) con lang seteado. Si falla o no hay modelo → queda en español (lang="es").
 */
export async function maybeTranslateReport(
  report: PreMortemReport,
  lang: "es" | "en"
): Promise<PreMortemReport> {
  if (lang !== "en") {
    report.lang = "es";
    return report;
  }
  const slots = collectSlots(report);
  const translated = await translateBatch(slots.map((s) => s.get()), "en");
  if (!translated || translated.length !== slots.length) {
    report.lang = "es"; // fallback consistente: todo español
    return report;
  }
  slots.forEach((s, i) => s.set(translated[i]));
  report.lang = "en";
  return report;
}
