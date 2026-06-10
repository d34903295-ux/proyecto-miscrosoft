// ─────────────────────────────────────────────────────────────
// "Ya lo intentaron": empareja el proyecto del usuario con fracasos PÚBLICOS
// reales de otras empresas con una idea similar. Memoria EXTERNA (complementa
// la memoria interna tipo Work IQ). Cada caso trae fuente verificable.
// ─────────────────────────────────────────────────────────────

import type { ExternalFailure, ProjectProfile } from "./types";
import { buildVectorizer, vectorizeQuery, cosine } from "./textsim";
import data from "./memory/external_failures.json";

type RawFailure = Omit<ExternalFailure, "score" | "matchedOn">;
const FAILURES = data as RawFailure[];

const ARCH_RULES: { key: string; re: RegExp }[] = [
  { key: "marketplace", re: /marketplace|plataforma|dos lados|proveedores y comprador|oferta y demanda|conecta a/i },
  { key: "delivery-logistics", re: /delivery|reparto|entrega|log[ií]stica|grocery|supermercado|last.?mile|a domicilio/i },
  { key: "hardware-iot", re: /hardware|dispositivo|iot|sensor|wearable|gadget|robot/i },
  { key: "fintech-crypto", re: /pago|fintech|wallet|cripto|crypto|blockchain|cr[eé]dito|banco|tarjeta/i },
  { key: "social-media", re: /social|red social|contenido|streaming|video|comunidad|media/i },
  { key: "d2c-subscription", re: /suscripci[oó]n|d2c|e.?commerce|tienda online|caja mensual|retail/i },
  { key: "ai-ml", re: /\bia\b|inteligencia artificial|machine learning|\bml\b|asistente|chatbot|gpt|generativ|modelo/i },
  { key: "ondemand-services", re: /on.?demand|bajo demanda|gig|limpieza|recados|chofer|transporte/i },
  { key: "health-regulated", re: /salud|m[eé]dico|telemedicina|biotech|cl[ií]nic|regulad/i },
];

function inferArchetypes(profile: ProjectProfile): string[] {
  const text = [profile.raw, profile.tech.join(" "), profile.marketBet.join(" ")].join(" ");
  return ARCH_RULES.filter((r) => r.re.test(text)).map((r) => r.key);
}

let vectorizer: ReturnType<typeof buildVectorizer> | null = null;
function getVectorizer() {
  if (!vectorizer) {
    vectorizer = buildVectorizer(
      FAILURES.map((f) => [f.company, f.idea, f.bet, f.whyFailed].join(" . "))
    );
  }
  return vectorizer;
}

/** Top-k fracasos externos más parecidos al proyecto del usuario. */
export function matchExternalFailures(profile: ProjectProfile, k = 3): ExternalFailure[] {
  if (!FAILURES.length) return [];
  const v = getVectorizer();
  const q = vectorizeQuery(
    [profile.raw, profile.keywords.join(" "), profile.tech.join(" "), profile.marketBet.join(" ")].join(" "),
    v.idf
  );
  const projArch = inferArchetypes(profile);

  const scored = FAILURES.map((f, i) => {
    const textScore = cosine(q, v.vectors[i]);
    const overlap = f.archetypes.filter((a) => projArch.includes(a));
    const archScore = projArch.length ? Math.min(1, overlap.length / Math.min(projArch.length, 2)) : 0;
    const score = 0.7 * textScore + 0.3 * archScore;
    return { f, score, matchedOn: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored
    // relevante = coincide en arquetipo, o tiene similitud textual decente.
    .filter((s) => s.matchedOn.length > 0 || s.score > 0.15)
    .slice(0, k)
    .map((s) => ({ ...s.f, score: Number(s.score.toFixed(4)), matchedOn: s.matchedOn }));
}
