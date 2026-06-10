// ─────────────────────────────────────────────────────────────
// Observabilidad: logs estructurados (JSON por línea, parseables por cualquier
// colector — Azure Monitor, Datadog, CloudWatch) + contadores en memoria que
// exporta /api/metrics en formato Prometheus.
// ─────────────────────────────────────────────────────────────

type Level = "info" | "warn" | "error";

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// ── métricas en memoria (por instancia) ───────────────────────
const counters = new Map<string, number>();
const durations = new Map<string, { count: number; sumMs: number; maxMs: number }>();
const STARTED_AT = Date.now();

export function inc(name: string, by = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function observe(name: string, ms: number): void {
  const d = durations.get(name) ?? { count: 0, sumMs: 0, maxMs: 0 };
  d.count += 1;
  d.sumMs += ms;
  d.maxMs = Math.max(d.maxMs, ms);
  durations.set(name, d);
}

/** Render en formato de exposición Prometheus. */
export function renderMetrics(): string {
  const lines: string[] = [
    "# HELP premortem_uptime_seconds Segundos desde el arranque de la instancia.",
    "# TYPE premortem_uptime_seconds gauge",
    `premortem_uptime_seconds ${Math.round((Date.now() - STARTED_AT) / 1000)}`,
  ];
  for (const [name, value] of [...counters.entries()].sort()) {
    lines.push(`# TYPE premortem_${name}_total counter`);
    lines.push(`premortem_${name}_total ${value}`);
  }
  for (const [name, d] of [...durations.entries()].sort()) {
    lines.push(`# TYPE premortem_${name}_duration_ms summary`);
    lines.push(`premortem_${name}_duration_ms_count ${d.count}`);
    lines.push(`premortem_${name}_duration_ms_sum ${Math.round(d.sumMs)}`);
    lines.push(`premortem_${name}_duration_ms_max ${Math.round(d.maxMs)}`);
  }
  return lines.join("\n") + "\n";
}
