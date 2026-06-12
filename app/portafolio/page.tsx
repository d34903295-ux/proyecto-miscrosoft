"use client";

// Triage de portafolio: pega varios proyectos (separados por "---"), el agente
// los analiza en paralelo y los rankea por índice de riesgo. Cada uno queda
// persistido con permalink para abrir el pre-mortem completo.

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { EASE, GrowBar } from "@/components/motion";

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
  { key: "rapido", label: "rápido", hint: "3 riesgos" },
  { key: "estandar", label: "estándar", hint: "6 riesgos" },
  { key: "profundo", label: "profundo", hint: "10 riesgos" },
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
  const [text, setText] = useState("");
  const [depth, setDepth] = useState<string>("estandar");
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
            // informes
          </Link>
          <Link href="/" className="syslink">
            &lt;&lt; volver
          </Link>
        </div>
      </div>

      <div className="statusline">
        {loading ? (
          <>
            <span className="run">&gt; analizando {projects.length} proyectos en paralelo…</span>
            <span className="cursor" />
          </>
        ) : ranking ? (
          <>
            <span className="ok">&gt; portafolio analizado</span> · {ranking.length} proyectos
            rankeados por riesgo
          </>
        ) : (
          <>
            &gt; triage de portafolio — pega varios proyectos separados por ---
            <span className="cursor" />
          </>
        )}
      </div>

      <section className="section">
        <div className="kicker">// portafolio · ¿cuál de estas apuestas mata primero?</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(28px, 5vw, 52px)" }}>
          Triage de iniciativas
        </h1>
        <p className="lede prose">
          Antes de repartir presupuesto: el agente analiza cada proyecto contra la memoria
          institucional, en paralelo, y los ordena del más al menos riesgoso — cada veredicto
          anclado a casos reales.
        </p>
      </section>

      <section className="section no-print">
        <div className="field-head">
          <span>&gt; proyectos (separados por ---, “# Título” opcional)</span>
          <span>{projects.length} detectados</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={12}
          aria-label="Lista de proyectos a analizar"
          placeholder={"# Proyecto A\ndescripción…\n---\n# Proyecto B\ndescripción…"}
        />
        <div className="presets">
          <span className="presets-label">// profundidad:</span>
          {DEPTHS.map((d) => (
            <button
              key={d.key}
              className={`chip-btn ${depth === d.key ? "on" : ""}`}
              aria-pressed={depth === d.key}
              onClick={() => setDepth(d.key)}
              disabled={loading}
              title={d.hint}
            >
              {d.label}
            </button>
          ))}
          <button className="chip-btn" onClick={() => setText(EXAMPLE)} disabled={loading}>
            cargar ejemplo
          </button>
        </div>
        <div className="controls">
          <button className="primary" onClick={analyze} disabled={loading || projects.length === 0}>
            {loading ? (
              <>
                <span className="spinner" />
                analizando…
              </>
            ) : (
              `[ analizar ${projects.length || ""} proyectos ]`
            )}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </section>

      {ranking && (
        <section className="section">
          <div className="field-head">
            <span>// modo VC · orden de inversión (menos riesgo primero, leído de abajo hacia arriba)</span>
            <span>memoria institucional como juez</span>
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
                      <small>/100 riesgo ({r.level}) · éxito relativo {r.successProb}%</small>
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
                          &gt;&gt; caso «{r.topCase.caseName.split("—")[0].trim()}»
                        </Link>
                      )}
                      {r.id && (
                        <Link className="cmd" href={`/informe/${r.id}`}>
                          &gt;&gt; pre-mortem completo
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
        Análisis en paralelo con caché por contenido. <b>MICROSOFT AGENTS LEAGUE</b> · TRACK
        REASONING AGENTS.
      </div>
    </div>
  );
}
