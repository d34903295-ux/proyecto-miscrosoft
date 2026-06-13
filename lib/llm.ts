// ─────────────────────────────────────────────────────────────
// Abstracción del razonamiento del agente.
//
//   ReasoningLLM        → interfaz única (extractProfile + deriveRisk)
//   StubReasoningLLM    → determinista, SIN API key (default). Hace correr el demo.
//   ChatReasoningLLM    → base para proveedores reales (prompt + JSON).
//   OpenAI / Azure OpenAI / GitHub Models / Ollama / Anthropic → adaptadores;
//   se activan por variables de entorno (LLM_PROVIDER).
//
// REGLA CLAVE ("recuerda, no inventa"): tanto el stub como los prompts
// componen el riesgo ESTRICTAMENTE a partir del registro pasado recuperado.
// El LLM solo mapea ese caso real al proyecto actual; no inventa hechos nuevos.
// ─────────────────────────────────────────────────────────────

import type {
  DerivedRiskCore,
  ProjectProfile,
  Refutation,
  RetrievalHit,
  Stands,
} from "./types";
import { STANDS } from "./types";
import { heuristicProfile } from "./profile";
import { recordLLMCall } from "./llmstatus";

export interface DeriveRiskInput {
  profile: ProjectProfile;
  hit: RetrievalHit;
}

export interface RefuteRiskInput {
  profile: ProjectProfile;
  hit: RetrievalHit;
  risk: DerivedRiskCore;
}

export interface ReasoningLLM {
  readonly name: string;
  extractProfile(description: string): Promise<ProjectProfile>;
  deriveRisk(input: DeriveRiskInput): Promise<DerivedRiskCore>;
  /** Paso anti-confirmación: intenta refutar el riesgo y recalibra la confianza. */
  refuteRisk(input: RefuteRiskInput): Promise<Refutation>;
}

const ALLOWED_TECH = [
  "app móvil", "web", "IA/ML", "chatbot/NLP", "datos/BI", "pagos/fintech",
  "cloud/migración", "legacy/integración", "API/plataforma", "IoT",
  "blockchain", "e-commerce", "realtime",
];
const ALLOWED_MARKET = [
  "first-mover", "nuevo mercado", "plataforma/escala", "crecimiento agresivo",
  "cumplimiento/regulación", "eficiencia/costos", "expansión internacional", "pivot",
];
const ALLOWED_TEAM = [
  "deadline agresivo", "equipo nuevo", "remoto/distribuido", "outsourcing",
  "multi-equipo", "founder-led", "alta rotación", "dependencia de persona clave",
];

function shortName(recordName: string): string {
  return recordName.split("—")[0].split("-")[0].trim() || recordName;
}

function readableDims(hit: RetrievalHit): string {
  if (!hit.matchedDimensions.length) return "varias características";
  return hit.matchedDimensions.join(", ");
}

/**
 * Refutación determinista (sin API): la fuerza del riesgo se calibra por la
 * calidad del match — cuántas dimensiones coinciden y qué tan relevante es el
 * caso. Un parecido apoyado en pocas dimensiones se trata como hipótesis, no
 * certeza, y baja la confianza.
 */
function standsFromConfidence(c: number): Stands {
  return c >= 0.6 ? "fuerte" : c >= 0.4 ? "parcial" : "débil";
}

function stubRefutation(hit: RetrievalHit, base: number): Refutation {
  const dims = hit.matchedDimensions.length;
  const dimsText = dims ? hit.matchedDimensions.join(", ") : "similitud textual";
  const name = shortName(hit.record.name);

  // La fuerza del riesgo se calibra por la calidad del match (cuántas
  // dimensiones coinciden y qué tan relevante es el caso).
  let factor = dims >= 3 ? 1.0 : dims >= 2 ? 0.82 : 0.62;
  if (hit.score < 0.25) factor *= 0.85;

  const adjustedConfidence = Number(
    Math.max(0.1, Math.min(0.99, base * factor)).toFixed(2)
  );
  // `stands` se DERIVA de la confianza calibrada → nunca contradice el %.
  const stands = standsFromConfidence(adjustedConfidence);

  const challenge =
    stands === "fuerte"
      ? `El parecido se sostiene: coincide con «${name}» en ${dimsText}, no solo de forma temática. El riesgo es trasladable.`
      : stands === "parcial"
        ? `Refutación parcial: el parecido con «${name}» se apoya en ${dimsText}. Verifica si tu contexto difiere lo suficiente como para no heredar este fallo.`
        : `Refutación: el parecido con «${name}» es mayormente temático (${dimsText}). El riesgo podría no trasladarse — trátalo como hipótesis a vigilar, no como certeza.`;

  return { stands, challenge, adjustedConfidence };
}

// ── Stub determinista ─────────────────────────────────────────
export class StubReasoningLLM implements ReasoningLLM {
  readonly name = "stub";

  async extractProfile(description: string): Promise<ProjectProfile> {
    return heuristicProfile(description);
  }

  async deriveRisk({ hit }: DeriveRiskInput): Promise<DerivedRiskCore> {
    const r = hit.record;
    return {
      title: `${r.failureCategory} — patrón visto en «${shortName(r.name)}» (${r.year})`,
      failureMode: r.whatWentWrong,
      whyItAppliesHere:
        `Tu proyecto comparte ${readableDims(hit)} con «${r.name}». ` +
        `Allí la apuesta «${r.assumption}» terminó en: ${r.outcome}`,
      earlyWarningSignals: r.ignoredSignals,
      mitigation: r.mitigation,
      confidence: Math.max(0.2, Math.min(0.99, hit.score)),
    };
  }

  async refuteRisk({ hit, risk }: RefuteRiskInput): Promise<Refutation> {
    return stubRefutation(hit, risk.confidence);
  }
}

// ── Base para proveedores de chat reales ──────────────────────
abstract class ChatReasoningLLM implements ReasoningLLM {
  abstract readonly name: string;
  protected abstract chatJSON(system: string, user: string): Promise<any>;

  async extractProfile(description: string): Promise<ProjectProfile> {
    const system =
      "Eres un analista de proyectos. Extrae un perfil estructurado del proyecto descrito. " +
      "Responde SOLO con JSON válido, sin texto extra.";
    const user =
      `Descripción del proyecto:\n"""${description}"""\n\n` +
      `Devuelve JSON con esta forma exacta:\n` +
      `{"summary": string, "clientType": uno de ["enterprise","startup","gobierno","consumer","pyme","interno","desconocido"], ` +
      `"tech": string[] (subconjunto de ${JSON.stringify(ALLOWED_TECH)}), ` +
      `"marketBet": string[] (subconjunto de ${JSON.stringify(ALLOWED_MARKET)}), ` +
      `"teamDynamics": string[] (subconjunto de ${JSON.stringify(ALLOWED_TEAM)}), ` +
      `"keywords": string[] (5-12 términos clave)}`;
    try {
      const j = await this.chatJSON(system, user);
      const fallback = heuristicProfile(description);
      return {
        raw: description,
        summary: typeof j.summary === "string" ? j.summary : fallback.summary,
        clientType: j.clientType ?? fallback.clientType,
        tech: Array.isArray(j.tech) && j.tech.length ? j.tech : fallback.tech,
        marketBet: Array.isArray(j.marketBet) && j.marketBet.length ? j.marketBet : fallback.marketBet,
        teamDynamics: Array.isArray(j.teamDynamics) && j.teamDynamics.length ? j.teamDynamics : fallback.teamDynamics,
        keywords: Array.isArray(j.keywords) && j.keywords.length ? j.keywords : fallback.keywords,
      };
    } catch (e) {
      console.warn(`[llm:${this.name}] extractProfile falló, uso heurística:`, e);
      return heuristicProfile(description);
    }
  }

  async deriveRisk({ profile, hit }: DeriveRiskInput): Promise<DerivedRiskCore> {
    const r = hit.record;
    const stub = new StubReasoningLLM();
    const system =
      "Eres un agente de pre-mortem institucional. REGLA ABSOLUTA: no inventes. " +
      "Debes anclar el riesgo ESTRICTAMENTE en el caso pasado provisto y solo mapearlo al proyecto actual. " +
      "No introduzcas hechos que no estén en el caso pasado. Responde SOLO con JSON válido.";
    const user =
      `PROYECTO ACTUAL:\n"""${profile.raw}"""\n\n` +
      `CASO PASADO REAL (única fuente de verdad permitida):\n${JSON.stringify(
        {
          nombre: r.name,
          año: r.year,
          apuesta: r.assumption,
          queSalioMal: r.whatWentWrong,
          señalesIgnoradas: r.ignoredSignals,
          resultado: r.outcome,
          leccion: r.mitigation,
        },
        null,
        2
      )}\n\n` +
      `Dimensiones que coinciden entre ambos: ${readableDims(hit)}.\n\n` +
      `Devuelve JSON: {"title": string (modo de fallo, corto), ` +
      `"failureMode": string (qué salió mal en el caso pasado), ` +
      `"whyItAppliesHere": string (por qué el proyecto actual corre el mismo riesgo, citando las dimensiones que coinciden), ` +
      `"earlyWarningSignals": string[] (señales tempranas a vigilar, basadas en las del caso), ` +
      `"mitigation": string (mitigación accionable, basada en la lección del caso), ` +
      `"confidence": number entre 0 y 1}`;
    try {
      const j = await this.chatJSON(system, user);
      return {
        title: j.title || `${r.failureCategory} — «${shortName(r.name)}»`,
        failureMode: j.failureMode || r.whatWentWrong,
        whyItAppliesHere: j.whyItAppliesHere || (await stub.deriveRisk({ profile, hit })).whyItAppliesHere,
        earlyWarningSignals:
          Array.isArray(j.earlyWarningSignals) && j.earlyWarningSignals.length
            ? j.earlyWarningSignals
            : r.ignoredSignals,
        mitigation: j.mitigation || r.mitigation,
        confidence:
          typeof j.confidence === "number"
            ? Math.max(0.2, Math.min(0.99, j.confidence))
            : Math.max(0.2, Math.min(0.99, hit.score)),
      };
    } catch (e) {
      console.warn(`[llm:${this.name}] deriveRisk falló, uso stub:`, e);
      return stub.deriveRisk({ profile, hit });
    }
  }

  async refuteRisk({ profile, hit, risk }: RefuteRiskInput): Promise<Refutation> {
    const r = hit.record;
    const system =
      "Eres un revisor escéptico (paso anti-confirmación) de un agente de pre-mortem. " +
      "Tu trabajo es intentar REFUTAR que el riesgo se traslada al proyecto actual. " +
      "Basa el contraargumento SOLO en la calidad del solapamiento (las dimensiones que coinciden) y en si el caso pasado realmente cubre ese modo de fallo. " +
      "NO afirmes hechos sobre el proyecto actual que no estén literalmente en su descripción; si faltan datos, dilo. " +
      "No inventes. Responde SOLO JSON.";
    const user =
      `PROYECTO ACTUAL (única descripción disponible, no asumas nada fuera de aquí):\n"""${profile.raw}"""\n\n` +
      `RIESGO PROPUESTO: ${risk.title}\nRazón: ${risk.whyItAppliesHere}\n` +
      `Confianza inicial: ${risk.confidence}\n\n` +
      `CASO PASADO: «${r.name}» (${r.year}). Qué salió mal: ${r.whatWentWrong}\n` +
      `Dimensiones que coinciden con el proyecto actual: ${readableDims(hit)}.\n\n` +
      `¿El parecido es real y trasladable, o superficial? Devuelve JSON: ` +
      `{"stands": uno de ["fuerte","parcial","débil"], "challenge": string (1-2 frases, sin inventar detalles del proyecto actual), ` +
      `"adjustedConfidence": number entre 0 y 1 (recalibra la confianza inicial)}`;
    try {
      const j = await this.chatJSON(system, user);
      // Normaliza `stands` (case/acentos) contra la fuente única STANDS.
      const norm = (s: string) =>
        s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const stands: Stands | undefined =
        typeof j.stands === "string"
          ? STANDS.find((v) => norm(v) === norm(j.stands))
          : undefined;
      const challengeOk =
        typeof j.challenge === "string" &&
        j.challenge.trim().length > 0 &&
        j.challenge.length <= 400;
      if (!stands || !challengeOk) {
        return stubRefutation(hit, risk.confidence);
      }
      const adjustedConfidence =
        typeof j.adjustedConfidence === "number"
          ? Number(Math.max(0.1, Math.min(0.99, j.adjustedConfidence)).toFixed(2))
          : stubRefutation(hit, risk.confidence).adjustedConfidence;
      return { stands, challenge: j.challenge.trim(), adjustedConfidence };
    } catch (e) {
      console.warn(`[llm:${this.name}] refuteRisk falló, uso stub:`, e);
      return stubRefutation(hit, risk.confidence);
    }
  }
}

function parseJSON(content: string): any {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── OpenAI / Azure / GitHub Models / Foundry Local / Ollama ──
// Todos hablan el mismo protocolo chat/completions; cambia URL, auth y modelo.
type OpenAICompatMode = "openai" | "azure" | "github" | "foundry" | "ollama";

class OpenAIReasoningLLM extends ChatReasoningLLM {
  readonly name: string;
  constructor(private mode: OpenAICompatMode) {
    super();
    this.name = mode;
  }
  protected async chatJSON(system: string, user: string): Promise<any> {
    let url: string;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let model: string;

    if (this.mode === "azure") {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview";
      url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
      headers["api-key"] = process.env.AZURE_OPENAI_API_KEY!;
      model = deployment;
    } else if (this.mode === "github") {
      // GitHub Models: inferencia GRATIS (con rate limits) usando un PAT de GitHub
      // con permiso `models: read`. Ideal para demo con LLM real sin tarjeta.
      url = "https://models.github.ai/inference/chat/completions";
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
      model = process.env.GITHUB_MODEL ?? "openai/gpt-4o-mini";
    } else if (this.mode === "foundry") {
      // Foundry Local: modelos de Microsoft Foundry corriendo en ESTA máquina,
      // GRATIS y sin cuenta de Azure. Endpoint OpenAI-compatible; el puerto es
      // dinámico (míralo con `foundry service status`). Esto satisface el mínimo
      // de integración Foundry exigido por el hackathon: "a Foundry hosted model".
      const base = (process.env.FOUNDRY_LOCAL_ENDPOINT ?? "http://localhost:5272").replace(/\/(v1\/?)?$/, "");
      url = `${base}/v1/chat/completions`;
      model = process.env.FOUNDRY_LOCAL_MODEL ?? "qwen2.5-0.5b";
    } else if (this.mode === "ollama") {
      // Ollama local (endpoint compatible con OpenAI). Razonamiento 100% offline.
      const base = (process.env.OLLAMA_HOST ?? "http://localhost:11434").replace(/\/$/, "");
      url = `${base}/v1/chat/completions`;
      model = process.env.OLLAMA_MODEL ?? "llama3.2";
    } else {
      url = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${process.env.OPENAI_API_KEY}`;
      model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    }

    // El modo JSON nativo (response_format) no siempre lo soportan los modelos
    // locales (Foundry Local / Ollama); ahí confiamos en el parseo robusto +
    // la instrucción "responde SOLO JSON". En la nube sí lo pedimos.
    const supportsJsonMode = this.mode !== "foundry" && this.mode !== "ollama";
    const body: Record<string, any> = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    };
    if (supportsJsonMode) body.response_format = { type: "json_object" };

    // Reintenta ante 429 (cuota del free tier) respetando Retry-After. Si el
    // modelo principal sigue sin cuota, cae a un modelo de RESPALDO (otro tier,
    // cuota aparte) — así el demo se auto-cura cuando se agota gpt-4o-mini.
    const fallbackModel =
      this.mode === "github" ? process.env.GITHUB_MODEL_FALLBACK ?? "openai/gpt-4o" : null;

    const attempt = async (useModel: string): Promise<Response> => {
      body.model = useModel;
      let r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      for (let a = 0; r.status === 429 && a < 2; a++) {
        const ra = Number(r.headers.get("retry-after"));
        const waitMs = Math.min((Number.isFinite(ra) && ra > 0 ? ra : 1.5 * 2 ** a) * 1000, 8000);
        await new Promise((res) => setTimeout(res, waitMs));
        r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      }
      return r;
    };

    let res: Response;
    try {
      res = await attempt(model);
      if (res.status === 429 && fallbackModel && fallbackModel !== model) {
        const alt = await attempt(fallbackModel);
        if (alt.ok || alt.status !== 429) {
          model = fallbackModel; // el reporte mostrará el modelo que sí respondió
          res = alt;
        }
      }
    } catch (e: any) {
      recordLLMCall(this.name, model, null, false, e?.message);
      throw e;
    }
    if (!res.ok) {
      const text = await res.text();
      recordLLMCall(this.name, model, res.headers, false, `HTTP ${res.status}`);
      throw new Error(`${this.name} HTTP ${res.status}: ${text}`);
    }
    recordLLMCall(this.name, model, res.headers, true);
    const data = await res.json();
    return parseJSON(data.choices?.[0]?.message?.content ?? "{}");
  }
}

// ── Anthropic ─────────────────────────────────────────────────
class AnthropicReasoningLLM extends ChatReasoningLLM {
  readonly name = "anthropic";
  protected async chatJSON(system: string, user: string): Promise<any> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        max_tokens: 1024,
        system: system + " Devuelve únicamente el objeto JSON.",
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = (data.content ?? []).map((b: any) => b.text ?? "").join("");
    return parseJSON(text);
  }
}

// ── Factory ───────────────────────────────────────────────────
export function getLLM(): ReasoningLLM {
  const provider = (process.env.LLM_PROVIDER ?? "stub").toLowerCase();
  switch (provider) {
    case "openai":
      if (process.env.OPENAI_API_KEY) return new OpenAIReasoningLLM("openai");
      console.warn("[llm] OPENAI_API_KEY ausente — uso stub.");
      return new StubReasoningLLM();
    case "azure":
      if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_DEPLOYMENT)
        return new OpenAIReasoningLLM("azure");
      console.warn("[llm] Config de Azure OpenAI incompleta — uso stub.");
      return new StubReasoningLLM();
    case "github":
      if (process.env.GITHUB_TOKEN) return new OpenAIReasoningLLM("github");
      console.warn("[llm] GITHUB_TOKEN ausente — uso stub.");
      return new StubReasoningLLM();
    case "foundry":
      // Foundry Local es un servicio local (sin key); si no responde, cada
      // llamada cae al stub por el catch. Modelo de Foundry, gratis y sin Azure.
      return new OpenAIReasoningLLM("foundry");
    case "ollama":
      // sin key: si el host no responde, cada llamada cae al stub por el catch.
      return new OpenAIReasoningLLM("ollama");
    case "anthropic":
      if (process.env.ANTHROPIC_API_KEY) return new AnthropicReasoningLLM();
      console.warn("[llm] ANTHROPIC_API_KEY ausente — uso stub.");
      return new StubReasoningLLM();
    case "stub":
    default:
      return new StubReasoningLLM();
  }
}
