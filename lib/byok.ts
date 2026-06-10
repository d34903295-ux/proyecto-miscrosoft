// BYOK (bring your own key) desde el frontend — OpenRouter.
// La key viaja por header por request, NUNCA se persiste ni se loguea.

import type { LLMOverride } from "./llm";

export function llmFromHeaders(req: Request): LLMOverride | undefined {
  const provider = req.headers.get("x-llm-provider")?.toLowerCase();
  if (provider !== "openrouter") return undefined;
  const apiKey = req.headers.get("x-llm-key") ?? undefined;
  if (!apiKey) return undefined;
  return { provider, apiKey, model: req.headers.get("x-llm-model") ?? undefined };
}
