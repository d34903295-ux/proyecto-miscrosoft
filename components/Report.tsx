"use client";

// El reporte pre-mortem completo, como componente reutilizable: lo renderiza
// la página principal tras generar, y también el permalink /informe/[id]
// para informes persistidos en el historial.

import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber, EASE, GrowBar, Reveal } from "@/components/motion";
import type {
  CoverageGap,
  DerivedRisk,
  ExternalFailure,
  GapQuestion,
  InspectedCase,
  PreMortemReport,
  TraceStep,
} from "@/lib/types";
import SimViz from "@/components/SimViz";
import RiskMatrix from "@/components/RiskMatrix";
import Tilt from "@/components/Tilt";

function sevLevel(severity: number): "high" | "mid" | "low" {
  if (severity >= 4) return "high";
  if (severity === 3) return "mid";
  return "low";
}

function exhibitLetter(rank: number): string {
  return String.fromCharCode(64 + rank);
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Color del badge = intensidad del riesgo que SOBREVIVE la refutación.
 *  fuerte = el fallo sí se traslada (alarma) → rojo; débil = refutado → atenuado. */
function standClass(stands: string): string {
  if (stands === "fuerte") return "high";
  if (stands === "parcial") return "mid";
  return "dim";
}

/** Sección plegable estilo terminal: cerrada muestra solo el encabezado con
 *  el conteo; el detalle se abre bajo demanda. Menos muro de texto. */
function Collapsible({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapse">
      <button
        className="collapse-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="collapse-meta">
          {count} <b>{open ? "[−]" : "[+]"}</b>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Resalta en el texto las palabras del proyecto que dispararon el match. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms || terms.length === 0) return <>{text}</>;
  const set = new Set(terms.map(norm));
  const chunks = text.split(/([^\p{L}\p{N}]+)/u);
  return (
    <>
      {chunks.map((c, i) =>
        c && set.has(norm(c)) ? (
          <mark key={i}>{c}</mark>
        ) : (
          <Fragment key={i}>{c}</Fragment>
        )
      )}
    </>
  );
}

export function reportToMarkdown(report: PreMortemReport): string {
  const p = report.profile;
  const v = report.verdict;
  const lines: string[] = [];
  lines.push(`# PRE-MORTEM / INSTITUCIONAL`);
  lines.push("");
  lines.push(`> No se predice. Se recuerda. Cada riesgo está anclado a un caso real del pasado.`);
  lines.push("");
  lines.push(`**Dictamen — Índice de riesgo ${v.riskIndex}/100 (${v.level}).** ${v.headline}`);
  lines.push("");
  lines.push(`**Perfil:** cliente: ${p.clientType} · tech: ${p.tech.join(", ")} · apuesta: ${p.marketBet.join(", ")} · equipo: ${p.teamDynamics.join(", ")}`);
  lines.push("");
  lines.push(`**${report.risks.length} modos de fallo** · ${report.casesInspected} casos inspeccionados · motor: ${report.generatedWith} · memoria: ${report.retrieverUsed}`);
  lines.push("");
  for (const r of report.risks) {
    lines.push(`## #${String(r.rank).padStart(2, "0")} · ${r.title}  _(confianza ${(r.confidence * 100).toFixed(0)}%)_`);
    lines.push(`- **Modo de fallo:** ${r.failureMode}`);
    lines.push(`- **Por qué aplica:** ${r.whyItAppliesHere}`);
    if (r.earlyWarningSignals.length) {
      lines.push(`- **Señales tempranas:**`);
      for (const s of r.earlyWarningSignals) lines.push(`  - ${s}`);
    }
    lines.push(`- **Mitigación:** ${r.mitigation}`);
    lines.push(`- **Contraanálisis (${r.refutation.stands}):** ${r.refutation.challenge}`);
    lines.push(`- **Exhibit ${exhibitLetter(r.rank)} (evidencia):** ${r.evidence.caseName} (${r.evidence.year}) — caso \`${r.evidence.caseId}\` · relevancia ${(r.evidence.retrievalScore * 100).toFixed(0)}% · dimensiones: ${r.evidence.matchedDimensions.join("; ") || "—"}`);
    lines.push(`  - Resultado de aquel caso: ${r.evidence.outcome}`);
    lines.push("");
  }
  const sim = report.simulation;
  lines.push(`## Simulación — ¿y si lo haces de todos modos? (10 años)`);
  lines.push(sim.summary);
  lines.push(`- Probabilidad de seguir vivo a 5 años: ~${Math.round(sim.survival5y * 100)}%`);
  lines.push(`- Probabilidad de seguir vivo a 10 años: ~${Math.round(sim.survival10y * 100)}%`);
  for (const e of sim.events) {
    lines.push(`- ${e.whenLabel}: ${e.failureCategory} (como «${e.caseName}»)`);
  }
  lines.push("");
  if (report.externalFailures.length) {
    lines.push(`## Ya lo intentaron — fracasos públicos con tu misma idea`);
    for (const f of report.externalFailures) {
      lines.push(`- **${f.company}** (${f.years}) — ${f.idea}`);
      lines.push(`  - Por qué fracasó: ${f.whyFailed}`);
      lines.push(`  - Lección: ${f.lesson}`);
      lines.push(`  - Fuente: ${f.source}`);
    }
    lines.push("");
  }
  if (report.gaps.length) {
    lines.push(`## Lo que el agente preguntaría (información ausente)`);
    for (const g of report.gaps) {
      lines.push(`- **${g.question}** _(falta: ${g.missing} → ${g.failureCategory})_`);
      lines.push(`  - ${g.why}`);
    }
    lines.push("");
  }
  if (report.coverage.length) {
    lines.push(`## Puntos ciegos de la memoria`);
    lines.push(`El silencio aquí no significa que no haya riesgo — la memoria no tiene casos parecidos en:`);
    for (const c of report.coverage) {
      lines.push(`- ${c.dimension}: ${c.value} (${c.casesInMemory} casos en memoria)`);
    }
    lines.push("");
  }
  if (report.inspected.length) {
    lines.push(`## Casos inspeccionados (transparencia)`);
    for (const c of report.inspected) {
      lines.push(`- ${c.included ? "✓" : "·"} ${c.caseName} (${c.year}) — \`${c.caseId}\` · rel ${(c.score * 100).toFixed(0)}% · ${c.reason}`);
    }
    lines.push("");
  }
  if (report.trace.length) {
    lines.push(`## Traza de razonamiento`);
    for (const t of report.trace) {
      lines.push(`- [${t.step}] **${t.name}** (${t.ms} ms): ${t.detail}`);
    }
    lines.push("");
  }
  lines.push(`---`);
  lines.push(`_Generado por Pre-Mortem Institucional · Microsoft Agents League · Track Reasoning Agents._`);
  return lines.join("\n");
}

function download(filename: string, text: string, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Report({ report }: { report: PreMortemReport }) {
  const { profile, risks, verdict } = report;
  const [copied, setCopied] = useState<"md" | "link" | null>(null);

  function flash(kind: "md" | "link") {
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  }

  function copyMd() {
    navigator.clipboard?.writeText(reportToMarkdown(report));
    flash("md");
  }

  function copyLink() {
    if (!report.id) return;
    navigator.clipboard?.writeText(`${window.location.origin}/informe/${report.id}`);
    flash("link");
  }

  return (
    <section className="section">
      <Reveal y={26}>
        <Tilt max={4}>
        <div className={`verdict level-${verdict.level}`}>
          <div className="verdict-main">
            <div className="vlabel">// dictamen forense</div>
            <div className="vheadline">{verdict.headline}</div>
            {verdict.dominantThemes.length > 0 && (
              <div className="tags" style={{ marginTop: 12 }}>
                {verdict.dominantThemes.map((t) => (
                  <span className="tag amber" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="verdict-meter">
            <div className="vindex">
              <AnimatedNumber value={verdict.riskIndex} />
              <span>/100</span>
            </div>
            <div className="vbar">
              <GrowBar pct={verdict.riskIndex} delay={0.15} />
            </div>
            <div className="vlevel">índice de riesgo · {verdict.level}</div>
            <div className="vhint prose">
              0 = sin parecidos peligrosos en la memoria · 100 = patrón de fracaso fuerte
            </div>
          </div>
        </div>
        </Tilt>
      </Reveal>

      <div className="field-head" style={{ marginTop: 26 }}>
        <span>// perfil_detectado</span>
      </div>
      <div className="tags">
        <span className="tag">
          <b>cliente</b> {profile.clientType}
        </span>
        {profile.tech.map((t) => (
          <span className="tag" key={`t-${t}`}>
            <b>tech</b> {t}
          </span>
        ))}
        {profile.marketBet.map((m) => (
          <span className="tag" key={`m-${m}`}>
            <b>apuesta</b> {m}
          </span>
        ))}
        {profile.teamDynamics.map((d) => (
          <span className="tag" key={`d-${d}`}>
            <b>equipo</b> {d}
          </span>
        ))}
      </div>

      <div className="divrule" />

      <div className="report-actions no-print">
        <button onClick={copyMd}>{copied === "md" ? "[ copiado ✓ ]" : "[ copiar .md ]"}</button>
        <button onClick={() => download("pre-mortem.md", reportToMarkdown(report))}>
          [ descargar .md ]
        </button>
        <button
          onClick={() => download("pre-mortem.json", JSON.stringify(report, null, 2), "application/json")}
        >
          [ exportar .json ]
        </button>
        <button onClick={() => window.print()}>[ imprimir / pdf ]</button>
        {report.id && (
          <button onClick={copyLink}>
            {copied === "link" ? "[ link copiado ✓ ]" : "[ copiar permalink ]"}
          </button>
        )}
      </div>

      <div className="legend no-print">
        <span className="key">
          <span className="swatch high" /> sev alta
        </span>
        <span className="key">
          <span className="swatch mid" /> media
        </span>
        <span className="key">
          <span className="swatch low" /> baja
        </span>
        <span className="key">barra ámbar = confianza del agente</span>
      </div>

      <div className="readout" style={{ marginTop: 18 }}>
        {risks.length} modos de fallo más probables // {report.casesInspected} casos inspeccionados
        en la memoria
      </div>

      <div className="records">
        {risks.map((risk, i) => (
          <RiskRecord key={risk.id} risk={risk} index={i} />
        ))}
      </div>

      <RiskMatrix risks={risks} />

      {report.gaps.length > 0 && (
        <Collapsible
          title="// lo que el agente preguntaría"
          count={`${report.gaps.length} preguntas`}
        >
          <GapsSection gaps={report.gaps} />
        </Collapsible>
      )}

      {report.coverage.length > 0 && (
        <Collapsible
          title="// puntos ciegos de la memoria"
          count={`${report.coverage.length} sin respaldo`}
        >
          <CoverageSection coverage={report.coverage} />
        </Collapsible>
      )}

      {report.externalFailures.length > 0 && (
        <Collapsible
          title="// ya lo intentaron · fracasos públicos"
          count={`${report.externalFailures.length} casos`}
        >
          <ExternalSection failures={report.externalFailures} />
        </Collapsible>
      )}

      <Collapsible
        title="// simulación · ¿y si lo haces de todos modos?"
        count={`vivo a 5 años ~${Math.round(report.simulation.survival5y * 100)}%`}
      >
        <SimViz simulation={report.simulation} />
      </Collapsible>

      <Collapsible
        title="// casos inspeccionados · transparencia"
        count={`${report.inspected.length} casos`}
      >
        <InspectedSection inspected={report.inspected} />
      </Collapsible>

      <Collapsible
        title="// traza de razonamiento"
        count={`${report.trace.length} pasos`}
      >
        <TraceSection trace={report.trace} />
      </Collapsible>
    </section>
  );
}

function TraceSection({ trace }: { trace: TraceStep[] }) {
  if (!trace || trace.length === 0) return null;
  return (
    <div className="trace">
      <div className="trace-log">
        {trace.map((t, i) => (
          <motion.div
            className="trace-row"
            key={t.step}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.09, ease: EASE }}
          >
            <span className="trace-n">[{t.step}]</span>
            <span className="trace-name">{t.name}</span>
            <span className="trace-detail">{t.detail}</span>
            <span className="trace-ms">{t.ms} ms</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function GapsSection({ gaps }: { gaps: GapQuestion[] }) {
  if (!gaps || gaps.length === 0) return null;
  return (
    <div className="gaps">
      <p className="lede prose" style={{ marginTop: 8 }}>
        Vienen de categorías de fallo reales de la memoria — no son curiosidad, son
        donde murieron otros.
      </p>
      <div className="gap-list">
        {gaps.map((g, i) => (
          <motion.div
            className="gap-card"
            key={g.missing}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px 0px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
          >
            <div className="gap-head">
              <span className="gap-missing">falta: {g.missing}</span>
              <span className="tag amber">{g.failureCategory}</span>
            </div>
            <div className="gap-q prose">{g.question}</div>
            <div className="gap-why prose">{g.why}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CoverageSection({ coverage }: { coverage: CoverageGap[] }) {
  if (!coverage || coverage.length === 0) return null;
  return (
    <div className="coverage">
      <p className="lede prose" style={{ marginTop: 8 }}>
        La memoria no tiene casos parecidos aquí: <b>el silencio no significa que no
        haya riesgo.</b>
      </p>
      <div className="tags">
        {coverage.map((c) => (
          <span className="tag" key={`${c.dimension}-${c.value}`}>
            <b>{c.dimension}</b> {c.value} · {c.casesInMemory} casos
          </span>
        ))}
      </div>
    </div>
  );
}

function ExternalSection({ failures }: { failures: ExternalFailure[] }) {
  if (!failures || failures.length === 0) return null;
  return (
    <div className="external">
      <div className="ext-list" style={{ marginTop: 10 }}>
        {failures.map((f, i) => (
          <motion.div
            className="ext-card"
            key={f.company}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px 0px" }}
            transition={{ duration: 0.45, delay: i * 0.1, ease: EASE }}
          >
            <div className="ext-head">
              <span className="ext-co">{f.company}</span>
              <span className="ext-years">{f.years}</span>
            </div>
            <div className="ext-idea prose">{f.idea}</div>
            <div className="field">
              <div className="label">// la apuesta</div>
              <div className="val prose">{f.bet}</div>
            </div>
            <div className="field">
              <div className="label">// por qué fracasó</div>
              <div className="val prose">{f.whyFailed}</div>
            </div>
            <div className="field">
              <div className="label">// la lección</div>
              <div className="val prose">{f.lesson}</div>
            </div>
            <div className="ext-foot">
              {f.funding && f.funding !== "—" && (
                <span className="tag">capital {f.funding}</span>
              )}
              <a className="cmd" href={f.source} target="_blank" rel="noreferrer">
                &gt;&gt; fuente
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function InspectedSection({ inspected }: { inspected: InspectedCase[] }) {
  if (!inspected || inspected.length === 0) return null;
  return (
    <div className="inspected">
      <div className="insp-list" style={{ marginTop: 10 }}>
        {inspected.map((c) => (
          <a
            key={c.caseId}
            className={`insp-row ${c.included ? "inc" : "exc"}`}
            href={c.webUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span className="insp-flag">{c.included ? "✓ incl" : "· desc"}</span>
            <span className="insp-name">
              {c.caseName} <span className="insp-year">({c.year})</span>
            </span>
            <span className="insp-score">rel {(c.score * 100).toFixed(0)}%</span>
            <span className="insp-reason">{c.reason}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function RiskRecord({ risk, index }: { risk: DerivedRisk; index: number }) {
  const lvl = sevLevel(risk.evidence.severity);
  // Solo el riesgo #1 abre expandido: lo demás a un toque. Menos muro de texto.
  const [open, setOpen] = useState(risk.rank === 1);
  return (
    <article className="record" style={{ animationDelay: `${Math.min(index * 0.07, 0.5)}s` }}>
      <div className="idx">
        #{String(risk.rank).padStart(2, "0")}
        <div className="sev-cells" title={`severidad ${risk.evidence.severity}/5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`sev-cell ${n <= risk.evidence.severity ? `on-${lvl}` : ""}`} />
          ))}
        </div>
      </div>

      <div className="rec-body">
        <h3>{risk.title}</h3>

        <div className="conf">
          <span>conf {(risk.confidence * 100).toFixed(0)}%</span>
          <span className="confbar">
            <GrowBar pct={Math.round(risk.confidence * 100)} delay={0.1} />
          </span>
          {Math.round(risk.priorConfidence * 100) !== Math.round(risk.confidence * 100) && (
            <span className="conf-prior">
              ← antes del contraanálisis {(risk.priorConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {!open && (
          <div className="rec-mini no-print">
            <a className="cmd" href={risk.evidence.webUrl} target="_blank" rel="noreferrer">
              &gt;&gt; evidencia: «{risk.evidence.caseName.split("—")[0].trim()}» ({risk.evidence.year})
            </a>
            <button className="rec-toggle" onClick={() => setOpen(true)}>
              [ + detalle ]
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={risk.rank === 1 ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              style={{ overflow: "hidden" }}
            >
        <div className="field">
          <div className="label">// modo de fallo</div>
          <div className="val prose">{risk.failureMode}</div>
        </div>

        <div className="field">
          <div className="label">// por qué aplica aquí</div>
          <div className="val prose">{risk.whyItAppliesHere}</div>
        </div>

        {risk.earlyWarningSignals.length > 0 && (
          <div className="field">
            <div className="label">// señales tempranas a vigilar</div>
            <ul className="prose">
              {risk.earlyWarningSignals.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="field">
          <div className="label">// mitigación sugerida</div>
          <div className="val prose">{risk.mitigation}</div>
        </div>

        <div className="field refute">
          <div className="label">
            // contraanálisis (anti-confirmación)
            <span className={`stands stands-${standClass(risk.refutation.stands)}`}>
              {risk.refutation.stands}
            </span>
          </div>
          <div className="val prose">{risk.refutation.challenge}</div>
        </div>

        <div className="exhibit">
          <div className="ex-head">
            <span>exhibit {exhibitLetter(risk.rank)} · evidencia</span>
            <span className="ref">
              {risk.evidence.caseId} · rel {(risk.evidence.retrievalScore * 100).toFixed(0)}%
            </span>
          </div>
          {risk.evidence.matchedDimensions.length > 0 && (
            <div className="tags" style={{ marginBottom: 10 }}>
              {risk.evidence.matchedDimensions.map((d, i) => (
                <span className="tag amber" key={i}>
                  ✓ {d}
                </span>
              ))}
            </div>
          )}
          <div className="quote">
            “<Highlight text={risk.evidence.extract} terms={risk.evidence.matchedTerms} />”
          </div>
          <div className="ex-foot">
            resultado // <span className="out">{risk.evidence.outcome}</span>
            <br />
            <a className="cmd" href={risk.evidence.webUrl} target="_blank" rel="noreferrer">
              &gt;&gt; abrir expediente — {risk.evidence.caseName} ({risk.evidence.year})
            </a>
          </div>
        </div>

        {risk.rank !== 1 && (
          <button className="rec-toggle no-print" onClick={() => setOpen(false)}>
            [ − cerrar detalle ]
          </button>
        )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}
