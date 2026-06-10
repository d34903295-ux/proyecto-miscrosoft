// ─────────────────────────────────────────────────────────────
// Notificación saliente al generar un informe: si WEBHOOK_URL está definida,
// se envía un POST JSON con el campo `text` — compatible con los incoming
// webhooks de Microsoft Teams y Slack sin configuración extra.
// Fire-and-forget con timeout: el webhook nunca bloquea ni rompe el análisis.
// ─────────────────────────────────────────────────────────────

import type { PreMortemReport } from "./types";
import { inc, log } from "./logger";

const TIMEOUT_MS = 4000;

export function notifyReport(report: PreMortemReport, baseUrl?: string): void {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  const v = report.verdict;
  const top = report.risks
    .slice(0, 3)
    .map((r) => `#${r.rank} [${r.failureCategory}] «${r.evidence.caseName}»`)
    .join(" · ");
  const link = report.id && baseUrl ? `\n${baseUrl}/informe/${report.id}` : "";
  const text =
    `🪦 Pre-mortem generado — índice de riesgo ${v.riskIndex}/100 (${v.level}).\n` +
    `${v.headline}\nTop: ${top}${link}`;

  // fire-and-forget: no se espera la promesa.
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
    .then((res) => {
      if (res.ok) inc("webhook_sent");
      else {
        inc("webhook_failed");
        log("warn", "webhook respondió error", { status: res.status });
      }
    })
    .catch((err) => {
      inc("webhook_failed");
      log("warn", "webhook falló", { err: err?.message });
    });
}
