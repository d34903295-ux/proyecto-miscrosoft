"use client";

// Triage de portafolio: pega varios proyectos (separados por "---"), el agente
// los analiza en paralelo y los rankea por índice de riesgo. Cada uno queda
// persistido con permalink para abrir el pre-mortem completo.

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { EASE, GrowBar } from "@/components/motion";
import { useLang } from "@/lib/i18n";

interface RankRow {
  rank: number;
  name: string;
  id: string | null;
  riskIndex: number;
  successProb: number;
  level: "alto" | "medio" | "bajo";
  headline: string;
  dominantThemes: string[];
  topCase: { caseId: string; caseName: string } | null;
  risks: number;
  gaps: number;
  cached: boolean;
}

const DEPTHS = [
  { key: "rapido", label: "rápido", en: "fast", hint: "3 riesgos" },
  { key: "estandar", label: "estándar", en: "standard", hint: "6 riesgos" },
  { key: "profundo", label: "profundo", en: "deep", hint: "10 riesgos" },
] as const;

const EXAMPLE = `# Wallet fintech
Somos una fintech y vamos a lanzar una wallet móvil con tarjeta virtual contrarreloj; la seguridad la endurecemos después del lanzamiento.
---
# Chatbot de soporte
Chatbot con IA generativa para resolver tickets de nivel 1 conectando el índice de búsqueda interno que ya tenemos.
---
# Streaming en vivo
App consumer a la que agregamos streaming en vivo con chat para conciertos, esperando decenas de miles de espectadores concurrentes.`;

/** Parsea bloques separados por líneas "---"; "# Título" opcional por bloque. */
function parseProjects(text: string): { name?: string; description: string }[] {
  return text
    .split(/^\s*---\s*$/m)
    .map((block) => {
      const lines = block.trim().split("\n");
      let name: string | undefined;
      if (lines[0]?.startsWith("#")) name = lines.shift()!.replace(/^#+\s*/, "").trim();
      return { name, description: lines.join("\n").trim() };
    })
    .filter((p) => p.description.length >= 20);
}

export default function PortafolioPage() {
  const [lang] = useLang();
  const tr = (es: string, en: string) => (lang === "en" ? en : es);
  const [text, setText] = useState("");
  const [depth, setDepth] = useState<string>("rapido");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankRow[] | null>(null);

  const projects = parseProjects(text);

  async function analyze() {
    if (projects.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setRanking(null);
    try {
      const res = await fetch("/api/premortem/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects, depth }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error desconocido");
      setRanking(data.ranking as RankRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Error analizando el portafolio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell">
      <div className="sysbar">
        <div className="brand">
          PRE-MORTEM<b>/</b>INSTITUCIONAL
        </div>
        <div className="sys-right">
          <Link href="/informes" className="syslink">
            {tr("// informes", "// reports")}
          </Link>
          <Link href="/" className="syslink">
            &lt;&lt; {tr("volver", "back")}
          </Link>
        </div>
      </div>

      <div className="statusline">
        {loading ? (
          <>
            <span className="run">&gt; {tr("analizando", "analyzing")} {projects.length} {tr("proyectos en paralelo…", "projects in parallel…")}</span>
            <span className="cursor" />
          </>
        ) : ranking ? (
          <>
            <span className="ok">&gt; {tr("portafolio analizado", "portfolio analyzed")}</span> · {ranking.length}{" "}
            {tr("proyectos rankeados por riesgo", "projects ranked by risk")}
          </>
        ) : (
          <>
            &gt; {tr("triage de portafolio — pega varios proyectos separados por ---", "portfolio triage — paste several projects separated by ---")}
            <span className="cursor" />
          </>
        )}
      </div>

      <section className="section">
        <div className="kicker">{tr("// portafolio · ¿cuál de estas apuestas mata primero?", "// portfolio · which of these bets dies first?")}</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(28px, 5vw, 52px)" }}>
          {tr("Triage de iniciativas", "Initiative triage")}
        </h1>
        <p className="lede prose">
          {tr(
            "Antes de repartir presupuesto: el agente analiza cada proyecto contra la memoria institucional, en paralelo, y los ordena del más al menos riesgoso — cada veredicto anclado a casos reales.",
            "Before you allocate budget: the agent analyzes each project against institutional memory, in parallel, and ranks them from most to least risky — every verdict anchored to real cases."
          )}
        </p>
      </section>

      <section className="section no-print">
        <div className="field-head">
          <span>&gt; {tr('proyectos (separados por ---, "# Título" opcional)', 'projects (separated by ---, "# Title" optional)')}</span>
          <span>{projects.length} {tr("detectados", "detected")}</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={12}
          aria-label={tr("Lista de proyectos a analizar", "List of projects to analyze")}
          placeholder={"# Project A\ndescription…\n---\n# Project B\ndescription…"}
        />
        <div className="presets">
          <span className="presets-label">{tr("// profundidad:", "// depth:")}</span>
          {DEPTHS.map((d) => (
            <button
              key={d.key}
              className={`chip-btn ${depth === d.key ? "on" : ""}`}
              aria-pressed={depth === d.key}
              onClick={() => setDepth(d.key)}
              disabled={loading}
              title={d.hint}
            >
              {tr(d.label, d.en)}
            </button>
          ))}
          <button className="chip-btn" onClick={() => setText(EXAMPLE)} disabled={loading}>
            {tr("cargar ejemplo", "load example")}
          </button>
        </div>
        <div className="controls">
          <button className="primary" onClick={analyze} disabled={loading || projects.length === 0}>
            {loading ? (
              <>
                <span className="spinner" />
                {tr("analizando…", "analyzing…")}
              </>
            ) : (
              tr(`[ analizar ${projects.length || ""} proyectos ]`, `[ analyze ${projects.length || ""} projects ]`)
            )}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </section>

      {ranking && (
        <section className="section">
          <div className="field-head">
            <span>{tr("// modo VC · orden de inversión (menos riesgo primero, leído de abajo hacia arriba)", "// VC mode · investment order (least risk first, read bottom-up)")}</span>
            <span>{tr("memoria institucional como juez", "institutional memory as the judge")}</span>
          </div>
          <div className="insp-list" style={{ marginTop: 12 }}>
            {ranking.map((r, i) => (
              <motion.div
                key={`${r.rank}-${r.name}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: EASE }}
              >
                <div className={`pf-row level-${r.level}`}>
                  <div className="pf-head">
                    <span className="pf-rank">#{r.rank}</span>
                    <span className="pf-name">{r.name}</span>
                    <span className="pf-index">
                      {r.riskIndex}
                      <small>/100 {tr("riesgo", "risk")} ({r.level}) · {tr("éxito relativo", "relative success")} {r.successProb}%</small>
                    </span>
                  </div>
                  <div className="pf-bar">
                    <GrowBar pct={r.riskIndex} delay={0.15 + i * 0.1} />
                  </div>
                  <div className="pf-meta prose">{r.headline}</div>
                  <div className="pf-foot">
                    <span className="tags">
                      {r.dominantThemes.slice(0, 3).map((t) => (
                        <span className="tag amber" key={t}>
                          {t}
                        </span>
                      ))}
                    </span>
                    <span className="pf-links">
                      {r.topCase && (
                        <Link className="cmd" href={`/case/${r.topCase.caseId}`}>
                          &gt;&gt; {tr("caso", "case")} «{r.topCase.caseName.split("—")[0].trim()}»
                        </Link>
                      )}
                      {r.id && (
                        <Link className="cmd" href={`/informe/${r.id}`}>
                          &gt;&gt; {tr("pre-mortem completo", "full pre-mortem")}
                        </Link>
                      )}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <div className="footer">
        {tr("Análisis en paralelo con caché por contenido.", "Parallel analysis with content-based caching.")}{" "}
        <b>MICROSOFT AGENTS LEAGUE</b> · TRACK REASONING AGENTS.
      </div>
    </div>
  );
}
