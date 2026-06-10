// ─────────────────────────────────────────────────────────────
// Guardas de API: autenticación por API key (opcional, por env) y rate
// limiting token-bucket en memoria por IP. Se invocan al inicio de cada
// handler; si devuelven una Response, el handler la retorna tal cual.
//
// API_KEY sin definir = endpoints abiertos (modo demo). Definida = los
// endpoints de escritura/cómputo exigen `x-api-key` (o Bearer).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { inc, log } from "./logger";

const buckets = new Map<string, { tokens: number; last: number }>();

/** req/min por IP para endpoints de cómputo (premortem, mcp) y escritura. */
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN ?? 30);

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") ?? "local").trim();
}

/** Token bucket: rellena RATE_LIMIT tokens por minuto, capacidad RATE_LIMIT. */
export function rateLimit(req: Request, route: string): NextResponse | null {
  if (RATE_LIMIT <= 0) return null; // desactivado explícitamente
  const ip = clientIp(req);
  const now = Date.now();
  const b = buckets.get(ip) ?? { tokens: RATE_LIMIT, last: now };
  b.tokens = Math.min(RATE_LIMIT, b.tokens + ((now - b.last) / 60_000) * RATE_LIMIT);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    inc("rate_limited");
    log("warn", "rate limit excedido", { route, ip });
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." },
      { status: 429, headers: { "Retry-After": "10" } }
    );
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  return null;
}

/** Exige x-api-key / Bearer si API_KEY está configurada. */
export function requireApiKey(req: Request, route: string): NextResponse | null {
  const expected = process.env.API_KEY;
  if (!expected) return null; // modo demo: abierto
  const got =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (got === expected) return null;
  inc("auth_rejected");
  log("warn", "api key inválida o ausente", { route });
  return NextResponse.json({ error: "No autorizado: falta x-api-key válida." }, { status: 401 });
}

/** Guarda combinada para endpoints protegidos. */
export function guard(req: Request, route: string): NextResponse | null {
  return requireApiKey(req, route) ?? rateLimit(req, route);
}
