"use client";

// El reporte pre-mortem completo, como componente reutilizable: lo renderiza
// la página principal tras generar, y también el permalink /informe/[id]
// para informes persistidos en el historial.

import { Fragment, createContext, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber, EASE, GrowBar, Reveal } from "@/components/motion";
import type {
  BoardDecision,
  CostModel,
  CoverageGap,
  DerivedRisk,
  ExternalFailure,
  GapQuestion,
  InspectedCase,
  PointOfNoReturn,
  PreMortemReport,
  TraceStep,
} from "@/lib/types";
import SimViz from "@/components/SimViz";
import RiskMatrix from "@/components/RiskMatrix";
import Tilt from "@/components/Tilt";
import { tlabel } from "@/lib/labels";

// ── i18n de los rótulos fijos del reporte ───────────────────────────────────
// El CONTENIDO (riesgos, consejo, funeral…) lo traduce el modelo en el servidor;
// aquí solo se traducen las etiquetas fijas de la UI. Lo que no esté en el
// diccionario cae a español de forma segura.
type RLang = "es" | "en";
const RLangCtx = createContext<RLang>("es");

const UI: Record<string, string> = {
  "// dictamen forense": "// forensic verdict",
  "índice de riesgo · ": "risk index · ",
  "0 = sin parecidos peligrosos en la memoria · 100 = patrón de fracaso fuerte":
    "0 = no dangerous matches in memory · 100 = strong failure pattern",
  "// perfil_detectado": "// detected_profile",
  cliente: "client",
  tech: "tech",
  apuesta: "bet",
  equipo: "team",
  "[ copiar .md ]": "[ copy .md ]",
  "[ copiado ✓ ]": "[ copied ✓ ]",
  "[ descargar .md ]": "[ download .md ]",
  "[ exportar .json ]": "[ export .json ]",
  "[ imprimir / pdf ]": "[ print / pdf ]",
  "[ copiar permalink ]": "[ copy permalink ]",
  "[ link copiado ✓ ]": "[ link copied ✓ ]",
  "sev alta": "sev high",
  media: "medium",
  baja: "low",
  "barra ámbar = confianza del agente": "amber bar = agent confidence",
  "modos de fallo más probables": "most likely failure modes",
  "casos inspeccionados en la memoria": "cases inspected in memory",
  // niveles
  alto: "high",
  medio: "medium",
  bajo: "low",
  // consejo
  "4 direcciones deliberan": "4 executives deliberate",
  "✓ invierte": "✓ invests",
  "◐ condiciona": "◐ conditional",
  "✗ no invierte": "✗ won't invest",
  convicción: "conviction",
  "// decisión del consejo": "// board decision",
  "SE INVIERTE": "INVEST",
  "INVERSIÓN POR TRAMOS": "STAGED INVESTMENT",
  "NO SE INVIERTE": "DO NOT INVEST",
  "pérdida esperada": "expected loss",
  // punto de no retorno
  "// punto de no retorno": "// point of no return",
  caso: "case",
  // coste
  "// coste esperado por riesgo": "// expected cost per risk",
  riesgo: "risk",
  "prob.": "prob.",
  impacto: "impact",
  "coste total esperado": "total expected cost",
  "las pérdidas esperadas se suman porque los riesgos no son excluyentes: pueden golpear varios.":
    "expected losses add up because the risks aren't mutually exclusive: several can hit.",
  // funeral
  "[ 🪦 muéstrame mi funeral ]": "[ 🪦 show me my funeral ]",
  "// obituario · escrito desde el futuro que este reporte intenta evitar":
    "// obituary · written from the future this report tries to avoid",
  "[ cerrar ]": "[ close ]",
  // gaps
  "// lo que el agente preguntaría": "// what the agent would ask",
  preguntas: "questions",
  "Vienen de categorías de fallo reales de la memoria — no son curiosidad, son donde murieron otros.":
    "They come from real failure categories in memory — not curiosity, but where others died.",
  "falta:": "missing:",
  // cobertura
  "// puntos ciegos de la memoria": "// memory blind spots",
  "sin respaldo": "unbacked",
  casos: "cases",
  // externos
  "// empresas que murieron por esto · fracasos mundiales":
    "// companies that died from this · global failures",
  "casos con fuente": "sourced cases",
  "// la apuesta": "// the bet",
  "// por qué fracasó": "// why it failed",
  "// la lección": "// the lesson",
  capital: "capital",
  fuente: "source",
  "// consejo de administración · ¿invertirías": "// board of directors · would you invest",
  "Si llegas a": "If you reach",
  "sin resolver esto, la probabilidad de fracaso supera el": "without solving this, the probability of failure exceeds",
  "Modelo ilustrativo sobre un presupuesto base de": "Illustrative model over a base budget of",
  ": probabilidad = confianza calibrada · impacto = fracción del presupuesto según la severidad histórica del caso.":
    ": probability = calibrated confidence · impact = budget fraction by the case's historical severity.",
  "La memoria no tiene casos parecidos aquí:": "Memory has no similar cases here:",
  "el silencio no significa que no haya riesgo.": "silence doesn't mean there's no risk.",
  // simulación
  "// simulación · ¿y si lo haces de todos modos?": "// simulation · what if you do it anyway?",
  "vivo a 5 años ~": "alive at 5y ~",
  // inspeccionados
  "// casos inspeccionados · transparencia": "// inspected cases · transparency",
  "✓ incl": "✓ incl",
  "· desc": "· skip",
  // traza
  "// traza de razonamiento": "// reasoning trace",
  pasos: "steps",
  // riesgo
  conf: "conf",
  "← antes del contraanálisis": "← before counter-analysis",
  evidencia: "evidence",
  "[ + detalle ]": "[ + detail ]",
  "// expediente interno anonimizado · nombre en clave": "// anonymized internal case file · codename",
  "// modo de fallo": "// failure mode",
  "// por qué aplica aquí": "// why it applies here",
  "// señales tempranas a vigilar": "// early warning signals",
  "// mitigación sugerida": "// suggested mitigation",
  "// contraanálisis (anti-confirmación)": "// counter-analysis (anti-confirmation)",
  fuerte: "strong",
  parcial: "partial",
  débil: "weak",
  resultado: "outcome",
  "abrir expediente —": "open case file —",
  "¿este riesgo ocurrió en la realidad?": "did this risk actually happen?",
  "[ ✓ sí ocurrió ]": "[ ✓ it happened ]",
  "[ ✗ no ocurrió ]": "[ ✗ it didn't ]",
  "— la memoria aprende": "— the memory learns",
  "precisión histórica del agente:": "agent historical accuracy:",
  "[ − cerrar detalle ]": "[ − close detail ]",
  registrado: "recorded",
  "✓ ocurrió": "✓ happened",
  "✗ no ocurrió": "✗ didn't happen",
  "// el mundo de los fracasos": "// the world of failures",
  // perfil vocab frecuente
  "app móvil": "mobile app",
  "migración cloud": "cloud migration",
  "deadline agresivo": "aggressive deadline",
  "equipo nuevo": "new team",
  "remoto/distribuido": "remote/distributed",
  "nuevo mercado": "new market",
  "plataforma/escala": "platform/scale",
  "crecimiento agresivo": "aggressive growth",
  gobierno: "government",
  interno: "internal",
  desconocido: "unknown",
};

function useTr(): (es: string) => string {
  const l = useContext(RLangCtx);
  return (es: string) => (l === "en" ? UI[es] ?? tlabel(es, "en") : es);
}

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

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

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
  if (report.board && report.costs) {
    const b = report.board;
    lines.push(`## Consejo de administración — ¿invertirías $${report.costs.budget.toLocaleString("en-US")}?`);
    for (const vt of b.votes) {
      lines.push(`- **${vt.role}** (${vt.roleLabel}): **${vt.vote}** (convicción ${(vt.confidence * 100).toFixed(0)}%) — ${vt.argument}`);
    }
    lines.push(`- **Decisión:** ${b.invest.toUpperCase()} — ${b.reason}`);
    lines.push("");
    lines.push(`## Coste esperado (presupuesto base $${report.costs.budget.toLocaleString("en-US")})`);
    for (const c of report.costs.perRisk) {
      lines.push(`- #${c.rank} ${c.failureCategory}: ${Math.round(c.probability * 100)}% × $${c.impact.toLocaleString("en-US")} = **$${c.expected.toLocaleString("en-US")}**`);
    }
    lines.push(`- **Coste total esperado: $${report.costs.totalExpected.toLocaleString("en-US")}** (las pérdidas se suman: los riesgos no son excluyentes)`);
    lines.push("");
  }
  if (report.pointOfNoReturn) {
    const p = report.pointOfNoReturn;
    lines.push(`## Punto de no retorno (${p.whenLabel})`);
    lines.push(`Si llegas ahí sin resolver esto, la probabilidad de fracaso supera el ${Math.round(p.failureProbability * 100)}%:`);
    for (const c of p.conditions) lines.push(`- ${c.condition} — ${c.deadline} (${c.failureCategory})`);
    lines.push("");
  }
  if (report.funeral) {
    lines.push(`## Obituario ("muéstrame mi funeral")`);
    lines.push(report.funeral);
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
  const lang: RLang = report.lang === "en" ? "en" : "es";
  const tr = (es: string) => (lang === "en" ? UI[es] ?? tlabel(es, "en") : es);
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
   <RLangCtx.Provider value={lang}>
    <section className="section">
      <Reveal y={26}>
        <Tilt max={4}>
        <div className={`verdict level-${verdict.level}`}>
          <div className="verdict-main">
            <div className="vlabel">{tr("// dictamen forense")}</div>
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
            <div className="vlevel">{tr("índice de riesgo · ")}{tr(verdict.level)}</div>
            <div className="vhint prose">
              {tr("0 = sin parecidos peligrosos en la memoria · 100 = patrón de fracaso fuerte")}
            </div>
          </div>
        </div>
        </Tilt>
      </Reveal>

      <div className="field-head" style={{ marginTop: 26 }}>
        <span>{tr("// perfil_detectado")}</span>
      </div>
      <div className="tags">
        <span className="tag">
          <b>{tr("cliente")}</b> {tr(profile.clientType)}
        </span>
        {profile.tech.map((t) => (
          <span className="tag" key={`t-${t}`}>
            <b>{tr("tech")}</b> {tr(t)}
          </span>
        ))}
        {profile.marketBet.map((m) => (
          <span className="tag" key={`m-${m}`}>
            <b>{tr("apuesta")}</b> {tr(m)}
          </span>
        ))}
        {profile.teamDynamics.map((d) => (
          <span className="tag" key={`d-${d}`}>
            <b>{tr("equipo")}</b> {tr(d)}
          </span>
        ))}
      </div>

      <div className="divrule" />

      <div className="report-actions no-print">
        <button onClick={copyMd}>{copied === "md" ? tr("[ copiado ✓ ]") : tr("[ copiar .md ]")}</button>
        <button onClick={() => download("pre-mortem.md", reportToMarkdown(report))}>
          {tr("[ descargar .md ]")}
        </button>
        <button
          onClick={() => download("pre-mortem.json", JSON.stringify(report, null, 2), "application/json")}
        >
          {tr("[ exportar .json ]")}
        </button>
        <button onClick={() => window.print()}>{tr("[ imprimir / pdf ]")}</button>
        {report.id && (
          <button onClick={copyLink}>
            {copied === "link" ? tr("[ link copiado ✓ ]") : tr("[ copiar permalink ]")}
          </button>
        )}
      </div>

      <div className="legend no-print">
        <span className="key">
          <span className="swatch high" /> {tr("sev alta")}
        </span>
        <span className="key">
          <span className="swatch mid" /> {tr("media")}
        </span>
        <span className="key">
          <span className="swatch low" /> {tr("baja")}
        </span>
        <span className="key">{tr("barra ámbar = confianza del agente")}</span>
      </div>

      <div className="readout" style={{ marginTop: 18 }}>
        {risks.length} {tr("modos de fallo más probables")} // {report.casesInspected}{" "}
        {tr("casos inspeccionados en la memoria")}
      </div>

      {/* informes guardados antes de v1.1 no traen estas secciones: se omiten sin romper */}
      {report.board && report.costs && <BoardSection board={report.board} costs={report.costs} />}

      {report.pointOfNoReturn && <PnrSection pnr={report.pointOfNoReturn} />}

      <div className="records">
        {risks.map((risk, i) => (
          <RiskRecord key={risk.id} risk={risk} index={i} reportId={report.id} />
        ))}
      </div>

      <RiskMatrix risks={risks} />

      {report.funeral && <FuneralSection funeral={report.funeral} />}

      {report.costs && (
        <Collapsible
          title={tr("// coste esperado por riesgo")}
          count={`${tr("pérdida esperada")} ${usd(report.costs.totalExpected)}`}
        >
          <CostSection costs={report.costs} />
        </Collapsible>
      )}

      {report.gaps.length > 0 && (
        <Collapsible
          title={tr("// lo que el agente preguntaría")}
          count={`${report.gaps.length} ${tr("preguntas")}`}
        >
          <GapsSection gaps={report.gaps} />
        </Collapsible>
      )}

      {report.coverage.length > 0 && (
        <Collapsible
          title={tr("// puntos ciegos de la memoria")}
          count={`${report.coverage.length} ${tr("sin respaldo")}`}
        >
          <CoverageSection coverage={report.coverage} />
        </Collapsible>
      )}

      {report.externalFailures.length > 0 && (
        <Collapsible
          title={tr("// empresas que murieron por esto · fracasos mundiales")}
          count={`${report.externalFailures.length} ${tr("casos con fuente")}`}
        >
          <ExternalSection failures={report.externalFailures} />
        </Collapsible>
      )}

      <Collapsible
        title={tr("// simulación · ¿y si lo haces de todos modos?")}
        count={`${tr("vivo a 5 años ~")}${Math.round(report.simulation.survival5y * 100)}%`}
      >
        <SimViz simulation={report.simulation} lang={lang} />
      </Collapsible>

      <Collapsible
        title={tr("// casos inspeccionados · transparencia")}
        count={`${report.inspected.length} ${tr("casos")}`}
      >
        <InspectedSection inspected={report.inspected} />
      </Collapsible>

      <Collapsible
        title={tr("// traza de razonamiento")}
        count={`${report.trace.length} ${tr("pasos")}`}
      >
        <TraceSection trace={report.trace} />
      </Collapsible>
    </section>
   </RLangCtx.Provider>
  );
}

/** 🔥 Consejo de administración simulado: ¿invertirías $1M? */
function BoardSection({ board, costs }: { board: BoardDecision; costs: CostModel }) {
  const tr = useTr();
  const cls = board.invest === "no" ? "alto" : board.invest === "condicionado" ? "medio" : "bajo";
  return (
    <Reveal className="boardroom">
      <div className="field-head" style={{ marginTop: 30 }}>
        <span>{tr("// consejo de administración · ¿invertirías")} {usd(costs.budget)}?</span>
        <span>{tr("4 direcciones deliberan")}</span>
      </div>
      <div className="board-votes">
        {board.votes.map((v, i) => (
          <motion.div
            className={`board-card vote-${v.vote === "sí" ? "si" : v.vote}`}
            key={v.role}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px 0px" }}
            transition={{ duration: 0.45, delay: i * 0.12, ease: EASE }}
          >
            <div className="board-head">
              <span className="board-role">{v.role}</span>
              <span className={`board-vote v-${v.vote === "sí" ? "si" : v.vote}`}>
                {v.vote === "sí" ? tr("✓ invierte") : v.vote === "condicionado" ? tr("◐ condiciona") : tr("✗ no invierte")}
              </span>
            </div>
            <div className="board-arg prose">{v.argument}</div>
            <div className="board-foot">
              {v.roleLabel} · {tr("convicción")} {(v.confidence * 100).toFixed(0)}%
            </div>
          </motion.div>
        ))}
      </div>
      <div className={`board-decision level-${cls}`}>
        <div className="board-dlabel">{tr("// decisión del consejo")}</div>
        <div className="board-dverdict">
          {board.invest === "sí" ? tr("SE INVIERTE") : board.invest === "condicionado" ? tr("INVERSIÓN POR TRAMOS") : tr("NO SE INVIERTE")}
          <small> · {tr("convicción")} {(board.confidence * 100).toFixed(0)}% · {tr("pérdida esperada")} {usd(costs.totalExpected)}</small>
        </div>
        <div className="board-dreason prose">{board.reason}</div>
      </div>
    </Reveal>
  );
}

/** 🚨 Punto de no retorno: condiciones con plazo. */
function PnrSection({ pnr }: { pnr: PointOfNoReturn | null }) {
  const tr = useTr();
  if (!pnr) return null;
  return (
    <Reveal className="pnr">
      <div className="field-head" style={{ marginTop: 30 }}>
        <span>{tr("// punto de no retorno")}</span>
        <span>{pnr.whenLabel}</span>
      </div>
      <div className="pnr-box">
        <div className="pnr-headline prose">
          {tr("Si llegas a")} <b>{pnr.whenLabel}</b> {tr("sin resolver esto, la probabilidad de fracaso supera el")}{" "}
          <b className="pnr-pct">{Math.round(pnr.failureProbability * 100)}%</b>:
        </div>
        <ul className="pnr-list prose">
          {pnr.conditions.map((c) => (
            <li key={c.caseId + c.failureCategory}>
              <b>{c.condition}</b>{" "}
              <span className="pnr-when">({c.deadline} · {tr(c.failureCategory).toLowerCase()} · {tr("caso")}{" "}
              <a className="cmd" href={`/case/${c.caseId}`}>{c.caseId}</a>)</span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

/** 💸 Coste esperado: probabilidad × impacto, en dinero. */
function CostSection({ costs }: { costs: CostModel }) {
  const tr = useTr();
  return (
    <div className="costs">
      <p className="lede prose" style={{ marginTop: 8 }}>
        {tr("Modelo ilustrativo sobre un presupuesto base de")} <b>{usd(costs.budget)}</b>
        {tr(": probabilidad = confianza calibrada · impacto = fracción del presupuesto según la severidad histórica del caso.")}
      </p>
      <div className="cost-table" role="table">
        <div className="cost-row cost-head" role="row">
          <span>{tr("riesgo")}</span><span>{tr("prob.")}</span><span>{tr("impacto")}</span><span>{tr("pérdida esperada")}</span>
        </div>
        {costs.perRisk.map((c) => (
          <div className="cost-row" role="row" key={c.rank}>
            <span>#{c.rank} {tr(c.failureCategory)}</span>
            <span>{Math.round(c.probability * 100)}%</span>
            <span>{usd(c.impact)}</span>
            <span className="cost-exp">{usd(c.expected)}</span>
          </div>
        ))}
        <div className="cost-row cost-total" role="row">
          <span>{tr("coste total esperado")}</span><span /><span />
          <span className="cost-exp">{usd(costs.totalExpected)}</span>
        </div>
      </div>
      <p className="mx-foot">
        {tr("las pérdidas esperadas se suman porque los riesgos no son excluyentes: pueden golpear varios.")}
      </p>
    </div>
  );
}

/** 🎬 "Muéstrame mi funeral" — el obituario del proyecto. */
function FuneralSection({ funeral }: { funeral: string }) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  if (!funeral) return null;
  return (
    <div className="funeral no-print">
      {!open ? (
        <button className="funeral-btn" onClick={() => setOpen(true)}>
          {tr("[ 🪦 muéstrame mi funeral ]")}
        </button>
      ) : (
        <motion.div
          className="funeral-box"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="field-head">
            <span>{tr("// obituario · escrito desde el futuro que este reporte intenta evitar")}</span>
            <button className="rec-toggle" onClick={() => setOpen(false)}>{tr("[ cerrar ]")}</button>
          </div>
          {funeral.split("\n\n").map((p, i) => (
            <motion.p
              className="funeral-p prose"
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.9, ease: EASE }}
            >
              {p}
            </motion.p>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function TraceSection({ trace }: { trace: TraceStep[] }) {
  if (!trace || trace.length === 0) return null;
  return (
    <div className="trace">
      <div className="trace-log trace-timeline">
        <span className="trace-spine" aria-hidden="true" />
        {trace.map((t, i) => (
          <motion.div
            className="trace-row"
            key={t.step}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px 0px" }}
            transition={{ duration: 0.4, delay: i * 0.1, ease: EASE }}
          >
            <span className="trace-node" aria-hidden="true" />
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
  const tr = useTr();
  if (!gaps || gaps.length === 0) return null;
  return (
    <div className="gaps">
      <p className="lede prose" style={{ marginTop: 8 }}>
        {tr("Vienen de categorías de fallo reales de la memoria — no son curiosidad, son donde murieron otros.")}
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
              <span className="gap-missing">{tr("falta:")} {tr(g.missing)}</span>
              <span className="tag amber">{tr(g.failureCategory)}</span>
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
  const tr = useTr();
  if (!coverage || coverage.length === 0) return null;
  return (
    <div className="coverage">
      <p className="lede prose" style={{ marginTop: 8 }}>
        {tr("La memoria no tiene casos parecidos aquí:")} <b>{tr("el silencio no significa que no haya riesgo.")}</b>
      </p>
      <div className="tags">
        {coverage.map((c) => (
          <span className="tag" key={`${c.dimension}-${c.value}`}>
            <b>{tr(c.dimension)}</b> {tr(c.value)} · {c.casesInMemory} {tr("casos")}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExternalSection({ failures }: { failures: ExternalFailure[] }) {
  const tr = useTr();
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
              <div className="label">{tr("// la apuesta")}</div>
              <div className="val prose">{f.bet}</div>
            </div>
            <div className="field">
              <div className="label">{tr("// por qué fracasó")}</div>
              <div className="val prose">{f.whyFailed}</div>
            </div>
            <div className="field">
              <div className="label">{tr("// la lección")}</div>
              <div className="val prose">{f.lesson}</div>
            </div>
            <div className="ext-foot">
              {f.funding && f.funding !== "—" && (
                <span className="tag">{tr("capital")} {f.funding}</span>
              )}
              <a className="cmd" href={f.source} target="_blank" rel="noreferrer">
                &gt;&gt; {tr("fuente")}
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function InspectedSection({ inspected }: { inspected: InspectedCase[] }) {
  const tr = useTr();
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
            <span className="insp-flag">{c.included ? tr("✓ incl") : tr("· desc")}</span>
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

function RiskRecord({
  risk,
  index,
  reportId,
}: {
  risk: DerivedRisk;
  index: number;
  reportId?: string;
}) {
  const tr = useTr();
  const lvl = sevLevel(risk.evidence.severity);
  // Solo el riesgo #1 abre expandido: lo demás a un toque. Menos muro de texto.
  const [open, setOpen] = useState(risk.rank === 1);
  // Memoria evolutiva: marcar si el riesgo ocurrió alimenta la precisión histórica.
  const [marked, setMarked] = useState<"sí" | "no" | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  async function sendFeedback(occurred: boolean) {
    if (!reportId || marked) return;
    setMarked(occurred ? "sí" : "no");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, riskId: risk.id, occurred }),
      });
      const data = await res.json();
      if (res.ok && typeof data.accuracy === "number") setAccuracy(data.accuracy);
    } catch {
      // el feedback es best-effort: no rompe la lectura del reporte
    }
  }
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
          <span>{tr("conf")} {(risk.confidence * 100).toFixed(0)}%</span>
          <span className="confbar">
            <GrowBar pct={Math.round(risk.confidence * 100)} delay={0.1} />
          </span>
          {Math.round(risk.priorConfidence * 100) !== Math.round(risk.confidence * 100) && (
            <span className="conf-prior">
              {tr("← antes del contraanálisis")} {(risk.priorConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {!open && (
          <div className="rec-mini no-print">
            <a className="cmd" href={risk.evidence.webUrl} target="_blank" rel="noreferrer">
              &gt;&gt; {tr("evidencia")}: «{risk.evidence.caseName.split("—")[0].trim()}» ({risk.evidence.year})
            </a>
            <button className="rec-toggle" onClick={() => setOpen(true)}>
              {tr("[ + detalle ]")}
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
          <div className="label">{tr("// modo de fallo")}</div>
          <div className="val prose">{risk.failureMode}</div>
        </div>

        <div className="field">
          <div className="label">{tr("// por qué aplica aquí")}</div>
          <div className="val prose">{risk.whyItAppliesHere}</div>
        </div>

        {risk.earlyWarningSignals.length > 0 && (
          <div className="field">
            <div className="label">{tr("// señales tempranas a vigilar")}</div>
            <ul className="prose">
              {risk.earlyWarningSignals.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="field">
          <div className="label">{tr("// mitigación sugerida")}</div>
          <div className="val prose">{risk.mitigation}</div>
        </div>

        <div className="field refute">
          <div className="label">
            {tr("// contraanálisis (anti-confirmación)")}
            <span className={`stands stands-${standClass(risk.refutation.stands)}`}>
              {tr(risk.refutation.stands)}
            </span>
          </div>
          <div className="val prose">{risk.refutation.challenge}</div>
        </div>

        <div className="exhibit">
          <div className="ex-head">
            <span>exhibit {exhibitLetter(risk.rank)} · {tr("evidencia")}</span>
            <span className="ref">
              {risk.evidence.caseId} · rel {(risk.evidence.retrievalScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="ex-internal">{tr("// expediente interno anonimizado · nombre en clave")}</div>
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
            {tr("resultado")} // <span className="out">{risk.evidence.outcome}</span>
            <br />
            <a className="cmd" href={risk.evidence.webUrl} target="_blank" rel="noreferrer">
              &gt;&gt; {tr("abrir expediente —")} {risk.evidence.caseName} ({risk.evidence.year})
            </a>
          </div>
        </div>

        {reportId && (
          <div className="feedback no-print">
            {marked ? (
              <span className="feedback-thanks">
                {tr("registrado")}: {marked === "sí" ? tr("✓ ocurrió") : tr("✗ no ocurrió")} {tr("— la memoria aprende")}
                {accuracy !== null && <> · {tr("precisión histórica del agente:")} {Math.round(accuracy * 100)}%</>}
              </span>
            ) : (
              <>
                <span className="feedback-q">{tr("¿este riesgo ocurrió en la realidad?")}</span>
                <button className="rec-toggle" onClick={() => sendFeedback(true)}>{tr("[ ✓ sí ocurrió ]")}</button>
                <button className="rec-toggle" onClick={() => sendFeedback(false)}>{tr("[ ✗ no ocurrió ]")}</button>
              </>
            )}
          </div>
        )}

        {risk.rank !== 1 && (
          <button className="rec-toggle no-print" onClick={() => setOpen(false)}>
            {tr("[ − cerrar detalle ]")}
          </button>
        )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}
