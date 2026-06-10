"use client";

// Matriz de riesgo (SVG propio, sin librerías): cada riesgo posicionado por
// confianza calibrada (x) × severidad histórica (y). Misma estética Terminal
// Forense que SimViz. El cuadrante superior derecho es "actuar ya": riesgos
// que sobrevivieron la refutación Y fueron graves en el caso real.

import { motion } from "framer-motion";
import type { DerivedRisk } from "@/lib/types";
import { EASE, Reveal } from "@/components/motion";

const W = 720;
const H = 300;
const PAD = { l: 46, r: 16, t: 18, b: 34 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

function xOf(confidence: number): number {
  return PAD.l + confidence * plotW;
}
function yOf(severity: number): number {
  // severidad 1..5 → de abajo hacia arriba
  return PAD.t + (1 - (severity - 1) / 4) * plotH;
}

/** Separa verticalmente puntos que caerían uno encima de otro. */
function dodge(risks: DerivedRisk[]): Map<string, number> {
  const offsets = new Map<string, number>();
  const taken: { x: number; y: number }[] = [];
  for (const r of risks) {
    const x = xOf(r.confidence);
    let y = yOf(r.evidence.severity);
    let dy = 0;
    while (taken.some((p) => Math.abs(p.x - x) < 26 && Math.abs(p.y - (y + dy)) < 18)) {
      dy += 18;
    }
    taken.push({ x, y: y + dy });
    offsets.set(r.id, dy);
  }
  return offsets;
}

export default function RiskMatrix({ risks }: { risks: DerivedRisk[] }) {
  if (!risks.length) return null;
  const offsets = dodge(risks);
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = [1, 2, 3, 4, 5];

  return (
    <Reveal className="matrix">
      <div className="field-head" style={{ marginTop: 30 }}>
        <span>// matriz de riesgo · severidad histórica × confianza tras refutación</span>
        <span>{risks.length} riesgos</span>
      </div>

      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Matriz de riesgo: severidad histórica contra confianza calibrada"
      >
        {/* zona crítica: confianza ≥ 0.5 y severidad ≥ 4 */}
        <rect
          x={xOf(0.5)}
          y={PAD.t}
          width={plotW / 2}
          height={yOf(4) - PAD.t + (plotH / 4) * 0.5}
          className="mx-danger"
        />
        {xTicks.map((tk) => (
          <g key={`x${tk}`}>
            <line x1={xOf(tk)} y1={PAD.t} x2={xOf(tk)} y2={PAD.t + plotH} className="ax-grid" />
            <text x={xOf(tk)} y={H - 12} className="ax-label" textAnchor="middle">
              {Math.round(tk * 100)}%
            </text>
          </g>
        ))}
        {yTicks.map((tk) => (
          <g key={`y${tk}`}>
            <line x1={PAD.l} y1={yOf(tk)} x2={W - PAD.r} y2={yOf(tk)} className="ax-grid" />
            <text x={PAD.l - 8} y={yOf(tk) + 3} className="ax-label" textAnchor="end">
              {tk}
            </text>
          </g>
        ))}
        <text x={W - PAD.r} y={H - 12} className="ax-label" textAnchor="end">
          confianza →
        </text>
        <text x={PAD.l - 30} y={PAD.t + 10} className="ax-label">
          sev
        </text>
        <text x={xOf(0.985)} y={yOf(4.92)} className="mx-zone" textAnchor="end">
          actuar ya
        </text>
        <text x={xOf(0.015)} y={yOf(1.2)} className="mx-zone">
          vigilar
        </text>

        {risks.map((r) => {
          const x = xOf(r.confidence);
          const y = yOf(r.evidence.severity) + (offsets.get(r.id) ?? 0);
          const critical = r.confidence >= 0.5 && r.evidence.severity >= 4;
          return (
            <motion.g
              key={r.id}
              initial={{ opacity: 0, scale: 0.4 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px 0px" }}
              transition={{ duration: 0.4, delay: 0.25 + r.rank * 0.12, ease: EASE }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              {/* la cola muestra cuánto movió la refutación el punto */}
              {Math.abs(r.priorConfidence - r.confidence) >= 0.01 && (
                <line
                  x1={xOf(r.priorConfidence)}
                  y1={y}
                  x2={x}
                  y2={y}
                  className="mx-tail"
                />
              )}
              <circle cx={x} cy={y} r={9} className={critical ? "mx-dot crit" : "mx-dot"} />
              <text x={x} y={y + 3.5} className="mx-num" textAnchor="middle">
                {r.rank}
              </text>
              <text x={x + 13} y={y + 3.5} className="mx-name">
                {r.evidence.caseId.replace(/^PRJ-\d{4}-/, "")}
              </text>
            </motion.g>
          );
        })}
      </svg>
      <div className="mx-foot">
        la cola gris de cada punto = confianza antes del contraanálisis · zona sombreada =
        severidad ≥4 con confianza ≥50%
      </div>
    </Reveal>
  );
}
