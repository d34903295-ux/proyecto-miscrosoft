// ─────────────────────────────────────────────────────────────
// Extracción heurística (determinista, sin API) del perfil del
// proyecto nuevo a partir de su descripción en lenguaje natural.
// Las MISMAS etiquetas que usa la memoria sintética, para que el
// solapamiento por dimensión funcione.
//
// Cuando se enchufa un LLM real, éste produce el mismo ProjectProfile
// con mejor matiz; esta heurística es el fallback que hace correr el demo.
// ─────────────────────────────────────────────────────────────

import type { ClientType, ProjectProfile } from "./types";
import { tokenize } from "./textsim";

type Rule<T> = { value: T; patterns: RegExp[] };

const CLIENT_RULES: Rule<ClientType>[] = [
  { value: "gobierno", patterns: [/gobierno|municip|estado|p[uú]blic|ministeri|ayuntamiento|sector p[uú]blico|hospital p[uú]blico/i] },
  { value: "enterprise", patterns: [/empresa grande|gran empresa|corporativ|banco|aseguradora|retailer|retail|cadena|franquicia|hospital|cl[ií]nica|red de|multinacional|enterprise|gran cliente|compa[ñn][ií]a/i] },
  { value: "startup", patterns: [/startup|emprendimiento|early.?stage|seed|levantar capital|runway|fundador|founder|mvp/i] },
  { value: "pyme", patterns: [/pyme|peque[ñn]a empresa|negocio local|comercio|tienda|emprend/i] },
  { value: "interno", patterns: [/interno|nuestra empresa|uso interno|empleados|equipo interno|herramienta interna/i] },
  { value: "consumer", patterns: [/consumidor|usuarios finales|p[uú]blico general|masivo|b2c|app para personas/i] },
];

const TECH_RULES: Rule<string>[] = [
  { value: "app móvil", patterns: [/\bapp\b|m[oó]vil|android|ios|smartphone|aplicaci[oó]n m[oó]vil/i] },
  { value: "web", patterns: [/web|portal|sitio|p[aá]gina|saas|dashboard|tablero/i] },
  { value: "IA/ML", patterns: [/\bia\b|inteligencia artificial|machine learning|\bml\b|modelo|llm|gpt|generativ|red neuronal|scoring/i] },
  { value: "chatbot/NLP", patterns: [/chatbot|asistente|copiloto|copilot|nlp|lenguaje natural|conversacional/i] },
  { value: "datos/BI", patterns: [/datos|data|bi\b|anal[ií]tic|warehouse|reporte|m[eé]tricas|tablero ejecutivo|business intelligence/i] },
  { value: "pagos/fintech", patterns: [/pago|fintech|tarjeta|cobro|transacci[oó]n|wallet|conciliaci[oó]n|cr[eé]dito|facturaci[oó]n/i] },
  { value: "cloud/migración", patterns: [/nube|cloud|aws|azure|gcp|migraci[oó]n|infraestructura|kubernetes/i] },
  { value: "legacy/integración", patterns: [/legacy|integraci[oó]n|core system|sistema viejo|erp|sap|api del cliente|on.?premise/i] },
  { value: "API/plataforma", patterns: [/plataforma|api\b|microservicio|integra|marketplace|conector/i] },
  { value: "IoT", patterns: [/iot|sensor|dispositivo|telemetr[ií]a|hardware|flota/i] },
  { value: "blockchain", patterns: [/blockchain|cripto|crypto|web3|token|nft/i] },
  { value: "e-commerce", patterns: [/e.?commerce|tienda online|carrito|comercio electr[oó]nico|ventas online/i] },
  { value: "realtime", patterns: [/tiempo real|realtime|streaming|concurren|alta carga|pico de tr[aá]fico|en vivo/i] },
];

const MARKET_RULES: Rule<string>[] = [
  { value: "first-mover", patterns: [/primer|first.?mover|pionero|nadie lo ha hecho|innovador/i] },
  { value: "nuevo mercado", patterns: [/nuevo mercado|mercado nuevo|entrar a|nuevo segmento|nueva categor[ií]a/i] },
  { value: "plataforma/escala", patterns: [/escalar|escala|plataforma|dos lados|red|efecto de red|crecer a millones/i] },
  { value: "crecimiento agresivo", patterns: [/crecimiento|crecer r[aá]pido|agresiv|tracci[oó]n|adquisici[oó]n de usuarios|viral/i] },
  { value: "cumplimiento/regulación", patterns: [/regulaci[oó]n|cumplimiento|compliance|normativa|legal|kyc|auditor[ií]a|privacidad/i] },
  { value: "eficiencia/costos", patterns: [/eficiencia|reducir costos|ahorro|optimizar|automatizar|productividad|bajar costos/i] },
  { value: "expansión internacional", patterns: [/internacional|otro pa[ií]s|expansi[oó]n|regi[oó]n|global|exportar/i] },
  { value: "pivot", patterns: [/pivot|cambio de rumbo|reorientar/i] },
];

const TEAM_RULES: Rule<string>[] = [
  { value: "deadline agresivo", patterns: [/fecha fija|deadline|plazo ajustado|contrarreloj|lanzar antes de|campa[ñn]a|black friday|fecha l[ií]mite/i] },
  { value: "equipo nuevo", patterns: [/equipo nuevo|primera vez|sin experiencia|reci[eé]n formado|no hemos hecho/i] },
  { value: "remoto/distribuido", patterns: [/remoto|distribuido|husos|zonas horarias|teletrabajo|equipo disperso/i] },
  { value: "outsourcing", patterns: [/outsourc|tercer|proveedor externo|subcontrat|consultora/i] },
  { value: "multi-equipo", patterns: [/varios equipos|multi.?equipo|m[uú]ltiples [aá]reas|coordinaci[oó]n entre|inter[aá]reas/i] },
  { value: "founder-led", patterns: [/fundador|founder|ceo decide|liderado por el due[ñn]o/i] },
  { value: "alta rotación", patterns: [/rotaci[oó]n|renuncias|gente que entra y sale|cambios de personal/i] },
  { value: "dependencia de persona clave", patterns: [/una sola persona|persona clave|bus factor|solo .* entiende|depende de un/i] },
];

function matchRules<T>(text: string, rules: Rule<T>[]): T[] {
  const out: T[] = [];
  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(text))) out.push(rule.value);
  }
  return out;
}

function topKeywords(text: string, k: number): string[] {
  const counts = new Map<string, number>();
  for (const tok of tokenize(text)) counts.set(tok, (counts.get(tok) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([w]) => w);
}

/** Construye un ProjectProfile determinista desde la descripción. */
export function heuristicProfile(description: string): ProjectProfile {
  const text = description || "";
  const clients = matchRules(text, CLIENT_RULES);
  const tech = matchRules(text, TECH_RULES);
  const marketBet = matchRules(text, MARKET_RULES);
  const teamDynamics = matchRules(text, TEAM_RULES);

  const summary =
    text.trim().length > 180 ? text.trim().slice(0, 177).trimEnd() + "…" : text.trim();

  return {
    raw: text,
    summary: summary || "(sin descripción)",
    clientType: clients[0] ?? "desconocido",
    tech: tech.length ? tech : ["web"],
    marketBet: marketBet.length ? marketBet : ["crecimiento agresivo"],
    teamDynamics: teamDynamics.length ? teamDynamics : ["equipo nuevo"],
    keywords: topKeywords(text, 12),
  };
}
