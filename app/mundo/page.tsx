"use client";

// El mundo de los fracasos: globo 3D con las sedes de empresas reales que
// murieron por los patrones que este agente detecta. Tocar un marcador abre
// su expediente (de la memoria externa, con fuente verificable).

import Link from "next/link";
import dynamicImport from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EASE, GrowBar } from "@/components/motion";
import type { FailureCluster } from "@/components/World3D";
import { TOTAL_COMPANIES, cityOfCompany, clusterOf } from "@/components/World3D";
import type { PreMortemReport } from "@/lib/types";
import failures from "@/lib/memory/external_failures.json";

// WebGL solo en cliente: el canvas se carga bajo demanda, nunca en SSR.
const World3D = dynamicImport(() => import("@/components/World3D"), {
  ssr: false,
  loading: () => <div className="readout world-loading">// cargando el planeta…</div>,
});

interface ExternalFailureRaw {
  company: string;
  years: string;
  idea: string;
  bet: string;
  whyFailed: string;
  lesson: string;
  funding: string;
  source: string;
}

export default function MundoPage() {
  const [selected, setSelected] = useState<FailureCluster | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  // el PRE-MORTEM ACTUAL: el último informe persistido del historial
  const [latest, setLatest] = useState<PreMortemReport | null>(null);
  const data = failures as ExternalFailureRaw[];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await (await fetch("/api/reports?limit=1")).json();
        const id = list?.reports?.[0]?.id;
        if (!id) return;
        const full = await (await fetch(`/api/reports/${id}`)).json();
        if (alive && full?.verdict) setLatest(full as PreMortemReport);
      } catch {
        // sin historial: la página funciona igual con la memoria completa
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // las empresas parecidas que ENCONTRÓ el análisis actual → laten en rojo
  const matched = useMemo(
    () => (latest?.externalFailures ?? []).map((f) => f.company).filter((c) => clusterOf(c)),
    [latest]
  );

  /** Ir directo a la ubicación exacta de una empresa del análisis actual. */
  function focusCompany(name: string) {
    const c = clusterOf(name);
    if (!c) return;
    setSelected(c);
    setCompany(name);
  }

  // al elegir zona: si tiene una sola empresa, abre su expediente directo
  function selectCluster(c: FailureCluster) {
    setSelected(c);
    setCompany(c.companies.length === 1 ? c.companies[0].company : null);
  }

  const info = useMemo(
    () => (company ? data.find((f) => f.company === company) ?? null : null),
    [company, data]
  );
  const cityOf = (name: string) =>
    selected?.companies.find((e) => e.company === name)?.city ?? "";

  return (
    <div className="shell">
      <div className="sysbar">
        <div className="brand">
          PRE-MORTEM<b>/</b>INSTITUCIONAL
        </div>
        <div className="sys-right">
          <Link href="/" className="syslink">
            &lt;&lt; volver
          </Link>
          <span>rev 1.1</span>
        </div>
      </div>

      <div className="statusline">
        <span className="ok">&gt; el mundo de los fracasos</span> · {TOTAL_COMPANIES} empresas reales
        en sus sedes reales · toca una luz ámbar
      </div>

      <section className="section" style={{ paddingBottom: 10 }}>
        <div className="kicker">// memoria externa · fracasos con coordenadas</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(28px, 5vw, 52px)" }}>
          Ya lo intentaron.
          <br />
          <span className="dim">En todo el planeta.</span>
        </h1>
        <p className="lede prose">
          Cada luz ámbar es la sede de una empresa real que murió por un patrón que este agente
          detecta. Gira el planeta, toca una luz y abre el expediente.
        </p>
      </section>

      <div className="world-wrap">
        <World3D selected={selected} highlightCompanies={matched} onSelect={selectCluster} />
        <div className="world-legend" aria-label="Leyenda del globo">
          <div className="wl-row">
            <span className="wl-dot wl-amber" /> archivo completo — siempre encendido: la historia
            no cambia
          </div>
          <div className="wl-row">
            <span className="wl-dot wl-red" /> tu análisis actual — cambia con cada pre-mortem
          </div>
          <div className="wl-row">
            <span className="wl-dot wl-gold" /> zona seleccionada
          </div>
          <div className="wl-row wl-hint">tamaño del punto = empresas muertas en la zona</div>
        </div>
      </div>

      {selected && (
        <section className="section" style={{ paddingBottom: info ? 0 : undefined }}>
          <div className="field-head">
            <span>// zona: {selected.area}</span>
            <span>{selected.companies.length} empresas murieron aquí</span>
          </div>
          <div className="presets" style={{ marginTop: 10 }}>
            {selected.companies.map((e) => (
              <button
                key={e.company}
                className={`chip-btn ${company === e.company ? "on" : ""}`}
                aria-pressed={company === e.company}
                onClick={() => setCompany(e.company)}
                title={e.city}
              >
                {e.company}
              </button>
            ))}
          </div>
        </section>
      )}

      {info && selected && (
        <motion.section
          className="section"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          key={info.company}
        >
          <div className="ext-card">
            <div className="ext-head">
              <span className="ext-co">{info.company}</span>
              <span className="ext-years">
                {info.years} · {cityOf(info.company)}
              </span>
            </div>
            <div className="ext-idea prose">{info.idea}</div>
            <div className="field">
              <div className="label">// por qué murió</div>
              <div className="val prose">{info.whyFailed}</div>
            </div>
            <div className="field">
              <div className="label">// la lección que este agente recuerda</div>
              <div className="val prose">{info.lesson}</div>
            </div>
            <div className="ext-foot">
              {info.funding && info.funding !== "—" && (
                <span className="tag">capital quemado {info.funding}</span>
              )}
              <a className="cmd" href={info.source} target="_blank" rel="noreferrer">
                &gt;&gt; fuente
              </a>
            </div>
          </div>
        </motion.section>
      )}

      {latest ? (
        <section className="section world-cta">
          <div className="field-head">
            <span>// pre-mortem actual · el último análisis corriendo en el sistema</span>
            {latest.id && (
              <Link className="syslink" href={`/informe/${latest.id}`}>
                abrir informe ↗
              </Link>
            )}
          </div>
          <div className={`pf-row level-${latest.verdict.level}`} style={{ marginTop: 10 }}>
            <div className="pf-head">
              <span className="pf-name">{latest.profile.summary}</span>
              <span className="pf-index">
                {latest.verdict.riskIndex}
                <small>/100 · {latest.verdict.level}</small>
              </span>
            </div>
            <div className="pf-bar">
              <GrowBar pct={latest.verdict.riskIndex} delay={0.1} />
            </div>
            <div className="pf-meta prose">{latest.verdict.headline}</div>
          </div>

          {matched.length > 0 && (
            <>
              <p className="lede prose" style={{ marginTop: 16 }}>
                Este análisis encontró <b>{matched.length} fracasos reales parecidos</b> — laten en{" "}
                <b style={{ color: "var(--red)" }}>rojo</b> sobre el planeta, en su ubicación exacta.
                Tócalos aquí:
              </p>
              <div className="presets" style={{ marginTop: 8 }}>
                {matched.map((name) => (
                  <button
                    key={name}
                    className={`chip-btn ${company === name ? "on" : ""}`}
                    onClick={() => focusCompany(name)}
                  >
                    ☠ {name} — {cityOfCompany(name)}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="section world-cta">
          <div className="kicker">// tu turno</div>
          <h2 className="world-cta-title">¿Tu proyecto repetirá la historia?</h2>
          <p className="lede prose">
            Aún no hay pre-mortems en el historial. Describe lo que vas a construir y el agente lo
            contrasta contra esta memoria — antes de que tu sede sea otra luz ámbar.
          </p>
          <div className="controls">
            <Link href="/">
              <button className="primary">[ ejecutar pre-mortem ]</button>
            </Link>
          </div>
        </section>
      )}

      <div className="footer">
        Globo construido con las texturas 3D del proyecto (albedo, relieve, nubes, luces
        nocturnas). <b>MICROSOFT AGENTS LEAGUE</b> · TRACK REASONING AGENTS.
      </div>
    </div>
  );
}
