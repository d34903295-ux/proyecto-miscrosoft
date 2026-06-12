// ─────────────────────────────────────────────────────────────
// Estado REAL del motor de razonamiento (GitHub Models / Foundry / Azure…).
//
// Cada llamada real al LLM registra aquí su resultado y los headers de rate
// limit que devuelve el gateway (GitHub Models expone x-ratelimit-*). El
// endpoint /api/llm-status lee este registro y puede hacer un ping mínimo
// en vivo para verificar que el modelo responde AHORA.
// ─────────────────────────────────────────────────────────────

export interface LLMStatus {
  provider: string;
  model: string | null;
  /** Última llamada real: ¿respondió bien? */
  ok: boolean | null;
  lastError: string | null;
  /** Peticiones restantes según el rate limit del gateway (si lo expone). */
  remainingRequests: number | null;
  limitRequests: number | null;
  /** Tokens restantes (si el gateway lo expone). */
  remainingTokens: number | null;
  /** Cuándo fue la última llamada real (ISO). */
  lastCallAt: string | null;
  /** Total de llamadas reales al LLM en este proceso. */
  calls: number;
}

const status: LLMStatus = {
  provider: "stub",
  model: null,
  ok: null,
  lastError: null,
  remainingRequests: null,
  limitRequests: null,
  remainingTokens: null,
  lastCallAt: null,
  calls: 0,
};

function readInt(headers: Headers, names: string[]): number | null {
  for (const n of names) {
    const v = headers.get(n);
    if (v != null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

/** Registra el resultado de una llamada real al LLM (con sus headers de cuota). */
export function recordLLMCall(
  provider: string,
  model: string,
  headers: Headers | null,
  ok: boolean,
  error?: string
): void {
  status.provider = provider;
  status.model = model;
  status.ok = ok;
  status.lastError = ok ? null : (error ?? "error desconocido").slice(0, 300);
  status.lastCallAt = new Date().toISOString();
  status.calls += 1;
  if (headers) {
    status.remainingRequests = readInt(headers, [
      "x-ratelimit-remaining-requests",
      "x-ratelimit-remaining",
      "ratelimit-remaining",
    ]);
    status.limitRequests = readInt(headers, [
      "x-ratelimit-limit-requests",
      "x-ratelimit-limit",
      "ratelimit-limit",
    ]);
    status.remainingTokens = readInt(headers, ["x-ratelimit-remaining-tokens"]);
  }
}

export function getLLMStatus(): LLMStatus {
  return { ...status };
}
