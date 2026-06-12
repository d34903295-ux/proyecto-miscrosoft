// Estado REAL del motor de razonamiento: proveedor/modelo configurados, si la
// última llamada respondió, y la cuota restante que reporta el gateway
// (GitHub Models expone x-ratelimit-*). Con ?ping=1 hace una llamada mínima
// EN VIVO para verificar que el modelo responde ahora mismo (rate-limited a
// 1 ping/30s por proceso para no quemar cuota).

import { NextResponse } from "next/server";
import { getLLMStatus, recordLLMCall } from "@/lib/llmstatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let lastPingAt = 0;

const PROVIDER_LABEL: Record<string, string> = {
  github: "GitHub Models · catálogo Microsoft Foundry",
  foundry: "Foundry Local · modelo Microsoft Foundry on-device",
  azure: "Azure OpenAI · Microsoft Foundry",
  openai: "OpenAI",
  ollama: "Ollama (local)",
  anthropic: "Anthropic",
  stub: "stub determinista (sin LLM)",
};

function envModel(provider: string): string | null {
  switch (provider) {
    case "github": return process.env.GITHUB_MODEL ?? "openai/gpt-4o-mini";
    case "foundry": return process.env.FOUNDRY_LOCAL_MODEL ?? "qwen2.5-0.5b";
    case "azure": return process.env.AZURE_OPENAI_DEPLOYMENT ?? null;
    case "openai": return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    case "ollama": return process.env.OLLAMA_MODEL ?? "llama3.2";
    case "anthropic": return process.env.ANTHROPIC_MODEL ?? null;
    default: return null;
  }
}

/** Ping mínimo al proveedor real (solo github, el camino del demo). */
async function pingGitHub(model: string): Promise<void> {
  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    }),
  });
  if (!res.ok) {
    recordLLMCall("github", model, res.headers, false, `HTTP ${res.status}`);
    return;
  }
  await res.json().catch(() => null);
  recordLLMCall("github", model, res.headers, true);
}

export async function GET(req: Request) {
  const provider = (process.env.LLM_PROVIDER ?? "stub").toLowerCase();
  const model = envModel(provider);
  const configured =
    provider === "stub" ||
    (provider === "github" && !!process.env.GITHUB_TOKEN) ||
    (provider === "azure" && !!process.env.AZURE_OPENAI_API_KEY) ||
    (provider === "openai" && !!process.env.OPENAI_API_KEY) ||
    (provider === "anthropic" && !!process.env.ANTHROPIC_API_KEY) ||
    provider === "foundry" ||
    provider === "ollama";

  const wantPing = new URL(req.url).searchParams.get("ping") === "1";
  if (wantPing && provider === "github" && process.env.GITHUB_TOKEN && model) {
    const now = Date.now();
    if (now - lastPingAt > 30_000) {
      lastPingAt = now;
      try {
        await pingGitHub(model);
      } catch (e: any) {
        recordLLMCall("github", model, null, false, e?.message);
      }
    }
  }

  const s = getLLMStatus();
  // El estado registrado solo cuenta si corresponde al proveedor configurado.
  const relevant = s.provider === provider && s.lastCallAt !== null;

  return NextResponse.json({
    provider,
    label: PROVIDER_LABEL[provider] ?? provider,
    model,
    configured,
    // activo = la última llamada REAL respondió bien (null = aún sin llamadas)
    active: relevant ? s.ok : null,
    lastError: relevant ? s.lastError : null,
    remainingRequests: relevant ? s.remainingRequests : null,
    limitRequests: relevant ? s.limitRequests : null,
    remainingTokens: relevant ? s.remainingTokens : null,
    lastCallAt: relevant ? s.lastCallAt : null,
    calls: relevant ? s.calls : 0,
  });
}
