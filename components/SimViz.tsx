"use client";

// Gráficos SVG propios (sin librerías) para la simulación, en estética
// Terminal Forense: filetes, mono, ámbar. Curva de supervivencia + trayectoria.

import Link from "next/link";
import { motion } from "framer-motion";
import type { Simulation, SimEvent, SimPoint } from "@/lib/types";
import { AnimatedNumber, EASE, Reveal } from "@/components/motion";

/** Línea que se dibuja sola al entrar en pantalla (efecto plotter). */
const drawIn = (delay = 0) => ({
  initial: { pathLength: 0, opacity: 0.3 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, margin: "-60px 0px" },
  transition: { duration: 1.6, delay, ease: EASE },
});

const W = 720;
const H = 230;
const PAD = { l: 46, r: 16, t: 16, b: 30 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

function xOf(q: number, horizon: number): number {
  return PAD.l + (q / horizon) * plotW;
}
function yOf01(v: number): number {
  return PAD.t + (1 - v) * plotH;
}
function yOf100(v: number): number {
  return PAD.t + (1 - v / 100) * plotH;
}

function YearTicks({ horizon }: { horizon: number }) {
  const years = [2, 4, 6, 8, 10];
  return (
    <>
      {years.map((y) => {
        const x = xOf(y * 4, horizon);
        return (
          <g key={y}>
            <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + plotH} className="ax-grid" />
            <text x={x} y={H - 10} className="ax-label" textAnchor="middle">
              Año {y}
            </text>
          </g>
        );
      })}
    </>
  );
}

function EventMarkers({ events, horizon }: { events: SimEvent[]; horizon: number }) {
  return (
    <>
      {events.map((e, i) => {
        const x = xOf(e.q, horizon);
        return (
          <g key={i}>
            <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + plotH} className="ax-event" />
            <circle cx={x} cy={PAD.t + 9} r={8} className="ax-evnum-bg" />
            <text x={x} y={PAD.t + 12} className="ax-evnum" textAnchor="middle">
              {i + 1}
            </text>
          </g>
        );
      })}
    </>
  );
}

function SurvivalChart({ sim }: { sim: Simulation }) {
  const { points, horizon } = { points: sim.points, horizon: sim.horizonQuarters };
  const poly = (key: "survival" | "survivalHalf" | "survivalAll") =>
    points
      .map((p) => `${xOf(p.q, horizon).toFixed(1)},${yOf01((p[key] ?? p.survival) as number).toFixed(1)}`)
      .join(" ");
  const area =
    `M ${xOf(0, horizon).toFixed(1)},${(PAD.t + plotH).toFixed(1)} ` +
    points.map((p) => `L ${xOf(p.q, horizon).toFixed(1)},${yOf01(p.survival).toFixed(1)}`).join(" ") +
    ` L ${xOf(horizon, horizon).toFixed(1)},${(PAD.t + plotH).toFixed(1)} Z`;
  const ticks = [0, 0.5, 1];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Curvas de supervivencia: mitigar todo / la mitad / ignorar">
      {ticks.map((tk) => (
        <g key={tk}>
          <line x1={PAD.l} y1={yOf01(tk)} x2={W - PAD.r} y2={yOf01(tk)} className="ax-grid" />
          <text x={PAD.l - 8} y={yOf01(tk) + 3} className="ax-label" textAnchor="end">
            {Math.round(tk * 100)}%
          </text>
        </g>
      ))}
      <YearTicks horizon={horizon} />
      <motion.path
        d={area}
        className="surv-area"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px 0px" }}
        transition={{ duration: 1.2, delay: 0.7, ease: EASE }}
      />
      {/* tres escenarios */}
      <motion.polyline points={poly("survivalAll")} className="surv-all" fill="none" {...drawIn(0.3)} />
      <motion.polyline points={poly("survivalHalf")} className="surv-half" fill="none" {...drawIn(0.15)} />
      <motion.polyline points={poly("survival")} className="surv-line" fill="none" {...drawIn(0)} />
      <g>
        <circle cx={xOf(20, horizon)} cy={yOf01(sim.survival5y)} r={3.5} className="dot-amber" />
        <text x={xOf(20, horizon) + 6} y={yOf01(sim.survival5y) - 6} className="ax-annot">
          5 años
        </text>
      </g>
      <EventMarkers events={sim.events} horizon={horizon} />
    </svg>
  );
}

function TrajectoryChart({ sim }: { sim: Simulation }) {
  const { points, horizonQuarters: horizon } = sim;
  const mk = (key: "ignore" | "mitigate") =>
    points.map((p: SimPoint) => `${xOf(p.q, horizon).toFixed(1)},${yOf100(p[key]).toFixed(1)}`).join(" ");
  const ticks = [0, 50, 100];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trayectoria proyectada: ignorar vs mitigar">
      {ticks.map((tk) => (
        <g key={tk}>
          <line x1={PAD.l} y1={yOf100(tk)} x2={W - PAD.r} y2={yOf100(tk)} className="ax-grid" />
          <text x={PAD.l - 8} y={yOf100(tk) + 3} className="ax-label" textAnchor="end">
            {tk}
          </text>
        </g>
      ))}
      <YearTicks horizon={horizon} />
      <motion.polyline points={mk("mitigate")} className="traj-mit" fill="none" {...drawIn(0.25)} />
      <motion.polyline points={mk("ignore")} className="traj-ign" fill="none" {...drawIn(0)} />
      <EventMarkers events={sim.events} horizon={horizon} />
    </svg>
  );
}

export default function SimViz({ simulation }: { simulation: Simulation }) {
  const sim = simulation;
  return (
    <div className="sim">
      <p className="sim-summary prose">{sim.summary}</p>

      {(() => {
        const sc = sim.scenarios ?? { all: sim.survival5y, half: sim.survival5y, ignore: sim.survival5y };
        return (
          <div className="sim-scenarios">
            <div className="scn scn-all">
              <div className="scn-num"><AnimatedNumber value={Math.round(sc.all * 100)} />%</div>
              <div className="scn-lbl">mitigas <b>todo</b></div>
            </div>
            <div className="scn-arrow">→</div>
            <div className="scn scn-half">
              <div className="scn-num"><AnimatedNumber value={Math.round(sc.half * 100)} />%</div>
              <div className="scn-lbl">mitigas <b>la mitad</b></div>
            </div>
            <div className="scn-arrow">→</div>
            <div className="scn scn-ign">
              <div className="scn-num"><AnimatedNumber value={Math.round(sc.ignore * 100)} />%</div>
              <div className="scn-lbl">ignoras <b>todo</b></div>
            </div>
          </div>
        );
      })()}
      <div className="scn-foot">prob. de seguir vivo a 5 años · cada escenario sale de los mismos riesgos reales</div>

      <div className="chart-title" style={{ marginTop: 16 }}>
        curva de supervivencia — <span className="lg-all">mitigar todo</span> ·{" "}
        <span className="lg-half">la mitad</span> · <span className="lg-ign">ignorar</span>
      </div>
      <SurvivalChart sim={sim} />

      <div className="chart-title" style={{ marginTop: 18 }}>
        trayectoria — <span className="lg-ign">ignorar señales</span> vs{" "}
        <span className="lg-mit">aplicar mitigaciones</span>
      </div>
      <TrajectoryChart sim={sim} />

      {sim.events.length > 0 && (
        <ol className="sim-events">
          {sim.events.map((e, i) => (
            <li key={i}>
              <span className="ev-n">{i + 1}</span>
              <span className="ev-when">{e.whenLabel}</span>
              <span className="ev-title">{e.failureCategory}</span>
              <Link className="ev-case" href={e.webUrl}>
                como «{e.caseName}» →
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
