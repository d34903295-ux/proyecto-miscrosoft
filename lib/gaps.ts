// ─────────────────────────────────────────────────────────────
// Conciencia de incertidumbre: qué NO dice la descripción.
//
// Un agente de razonamiento honesto no solo responde — también sabe qué le
// falta para responder mejor. Este módulo detecta, de forma determinista,
// información ausente en la descripción del proyecto y la convierte en las
// preguntas que el agente haría antes de confiar más en su pre-mortem.
// Cada pregunta se ancla a una categoría de fallo REAL de la memoria:
// no preguntamos por curiosidad, preguntamos porque ahí murieron otros.
// ─────────────────────────────────────────────────────────────

import type { GapQuestion, ProjectProfile } from "./types";

interface GapRule {
  missing: string;
  /** Si NINGÚN patrón aparece en la descripción, falta esta información. */
  presentIf: RegExp[];
  question: string;
  failureCategory: string;
  why: string;
}

const GAP_RULES: GapRule[] = [
  {
    missing: "plazo / fecha objetivo",
    presentIf: [/fecha|plazo|deadline|semanas|meses|trimestre|lanzar (en|antes)|q[1-4]|para (el|la) \d|contrarreloj/i],
    question: "¿Cuál es la fecha objetivo y qué pasa si se mueve?",
    failureCategory: "Time-to-market",
    why: "Los proyectos con fecha atada a algo externo (campaña, regulación, evento) heredan riesgos de time-to-market que una fecha flexible no tiene.",
  },
  {
    missing: "tamaño y experiencia del equipo",
    presentIf: [/equipo de \d|\d+ (personas|devs|desarrolladores|ingenieros)|seniors?|juniors?|años de experiencia|hemos hecho|ya construimos/i],
    question: "¿Cuántas personas tiene el equipo y cuántas han hecho algo similar antes?",
    failureCategory: "Dependencia de persona clave",
    why: "La memoria registra fallos donde todo dependía de una persona o de un equipo que aprendía el dominio sobre la marcha.",
  },
  {
    missing: "métrica de éxito",
    presentIf: [/m[eé]trica|kpi|objetivo de|medir|éxito si|target|meta de|conversi[oó]n|retenci[oó]n|adopci[oó]n de \d/i],
    question: "¿Cómo sabrán en 90 días si esto funciona — qué número tiene que moverse?",
    failureCategory: "Adopción/onboarding",
    why: "Varios casos de la memoria murieron lanzados y «funcionando», pero sin adopción que nadie estaba midiendo a tiempo.",
  },
  {
    missing: "validación con usuarios reales",
    presentIf: [/usuarios (nos|ya)|piloto|prototipo|entrevista|validamos|probamos con|feedback|early adopter|beta/i],
    question: "¿Qué evidencia directa de usuarios reales respalda la apuesta (piloto, entrevistas, beta)?",
    failureCategory: "Expectativas del cliente",
    why: "El patrón más repetido de la memoria: construir sobre lo que el cliente DIJO querer, no sobre lo que se comprobó que usa.",
  },
  {
    missing: "dependencias externas",
    presentIf: [/depend(e|emos)|integra(ci[oó]n|r) con|api de|proveedor|tercero|del cliente|sistema (existente|legacy|viejo)/i],
    question: "¿De qué sistemas, APIs o equipos de terceros depende el proyecto, y quién responde por ellos?",
    failureCategory: "Integración legacy",
    why: "Las integraciones con sistemas ajenos consumieron la mayoría del esfuerzo en varios casos de la memoria — siempre subestimadas.",
  },
  {
    missing: "plan de datos",
    presentIf: [/datos (de|del|hist[oó]ricos)|dataset|calidad de datos|etiquetad|data pipeline|fuentes de datos/i],
    question: "¿Existen ya los datos que el sistema necesita, con la calidad necesaria, o hay que crearlos?",
    failureCategory: "Calidad de datos",
    why: "En la memoria hay proyectos de IA/BI que asumieron datos limpios y encontraron basura: el modelo era lo de menos.",
  },
];

/** Solo preguntar por datos si el proyecto realmente toca datos/IA. */
const DATA_TECH = new Set(["IA/ML", "datos/BI", "chatbot/NLP"]);

/**
 * Detecta la información ausente en la descripción y devuelve las preguntas
 * que el agente haría, cada una anclada a la categoría de fallo que la motiva.
 */
export function detectGaps(profile: ProjectProfile): GapQuestion[] {
  const text = profile.raw;
  const out: GapQuestion[] = [];
  for (const rule of GAP_RULES) {
    if (rule.missing === "plan de datos" && !profile.tech.some((t) => DATA_TECH.has(t))) {
      continue;
    }
    const present = rule.presentIf.some((p) => p.test(text));
    if (!present) {
      out.push({
        missing: rule.missing,
        question: rule.question,
        failureCategory: rule.failureCategory,
        why: rule.why,
      });
    }
  }
  return out;
}
