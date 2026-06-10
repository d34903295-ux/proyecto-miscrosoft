// ─────────────────────────────────────────────────────────────
// Validación de entrada (sin dependencias): errores legibles por campo.
// Etiquetas válidas = las mismas que usa el perfilador y la memoria, para que
// un caso agregado en runtime haga match igual que uno sembrado.
// ─────────────────────────────────────────────────────────────

import type { PastProjectRecord } from "./types";

export const VALID_TECH = [
  "app móvil", "web", "IA/ML", "chatbot/NLP", "datos/BI", "pagos/fintech",
  "cloud/migración", "legacy/integración", "API/plataforma", "IoT",
  "blockchain", "e-commerce", "realtime",
] as const;

export const VALID_MARKET = [
  "first-mover", "nuevo mercado", "plataforma/escala", "crecimiento agresivo",
  "cumplimiento/regulación", "eficiencia/costos", "expansión internacional", "pivot",
] as const;

export const VALID_TEAM = [
  "deadline agresivo", "equipo nuevo", "remoto/distribuido", "outsourcing",
  "multi-equipo", "founder-led", "alta rotación", "dependencia de persona clave",
] as const;

export const VALID_CLIENT = [
  "enterprise", "startup", "gobierno", "consumer", "pyme", "interno",
] as const;

export const VALID_CATEGORY = [
  "Time-to-market", "Adopción/onboarding", "UX/usabilidad", "Integración legacy",
  "Calidad de datos", "Expectativas del cliente", "Alcance/scope creep",
  "Modelo de IA en producción", "Pagos/conciliación", "Coordinación multi-equipo",
  "Performance/escala", "Sobreingeniería", "Seguridad", "Dependencia de proveedor",
  "Dependencia de persona clave", "Cumplimiento/regulación", "Rotación/conocimiento",
] as const;

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

function str(v: unknown, field: string, min: number, max: number, errors: string[]): string {
  if (typeof v !== "string" || v.trim().length < min) {
    errors.push(`${field}: texto de al menos ${min} caracteres`);
    return "";
  }
  if (v.length > max) {
    errors.push(`${field}: máximo ${max} caracteres`);
    return "";
  }
  return v.trim();
}

function oneOf<T extends string>(v: unknown, field: string, valid: readonly T[], errors: string[]): T {
  if (typeof v !== "string" || !valid.includes(v as T)) {
    errors.push(`${field}: debe ser uno de [${valid.join(", ")}]`);
    return valid[0];
  }
  return v as T;
}

/** Valida el cuerpo de un caso nuevo para la memoria. El id se asigna fuera. */
export function validateCaseInput(body: any): ValidationResult<Omit<PastProjectRecord, "id">> {
  const errors: string[] = [];
  const b = body ?? {};

  const name = str(b.name, "name", 5, 200, errors);
  const description = str(b.description, "description", 20, 2000, errors);
  const assumption = str(b.assumption, "assumption", 10, 2000, errors);
  const whatWentWrong = str(b.whatWentWrong, "whatWentWrong", 20, 4000, errors);
  const outcome = str(b.outcome, "outcome", 10, 2000, errors);
  const mitigation = str(b.mitigation, "mitigation", 10, 4000, errors);

  const year = Number(b.year);
  if (!Number.isInteger(year) || year < 1990 || year > 2100) errors.push("year: entero entre 1990 y 2100");

  const severity = Number(b.severity);
  if (!Number.isInteger(severity) || severity < 1 || severity > 5) errors.push("severity: entero 1..5");

  const clientType = oneOf(b.clientType, "clientType", VALID_CLIENT, errors);
  const marketBet = oneOf(b.marketBet, "marketBet", VALID_MARKET, errors);
  const teamDynamics = oneOf(b.teamDynamics, "teamDynamics", VALID_TEAM, errors);
  const failureCategory = oneOf(b.failureCategory, "failureCategory", VALID_CATEGORY, errors);

  if (!Array.isArray(b.tech) || b.tech.length === 0) {
    errors.push("tech: lista no vacía");
  } else {
    for (const t of b.tech) {
      if (!VALID_TECH.includes(t)) errors.push(`tech: «${t}» no es válido (usa [${VALID_TECH.join(", ")}])`);
    }
  }

  if (!Array.isArray(b.ignoredSignals) || b.ignoredSignals.length < 1) {
    errors.push("ignoredSignals: lista con al menos 1 señal");
  } else {
    for (const s of b.ignoredSignals) {
      if (typeof s !== "string" || s.trim().length < 5) errors.push("ignoredSignals: cada señal con al menos 5 caracteres");
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    value: {
      name,
      year,
      clientType,
      tech: b.tech,
      marketBet,
      teamDynamics,
      description,
      assumption,
      whatWentWrong,
      ignoredSignals: b.ignoredSignals.map((s: string) => s.trim()),
      outcome,
      severity,
      failureCategory,
      mitigation,
    },
  };
}
