"use client";

// El mundo de los fracasos: globo 3D con las sedes de empresas reales que
// murieron por los patrones que este agente detecta. Tocar un marcador abre
// su expediente (de la memoria externa, con fuente verificable).

import Link from "next/link";
import dynamicImport from "next/dynamic";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EASE } from "@/components/motion";
import type { FailureMarker } from "@/components/World3D";
import { MARKERS } from "@/components/World3D";
import failures from "@/lib/memory/external_failures.json";

// WebGL solo en cliente: el canvas se carga bajo demanda, nunca en SSR.
const World3D = dynamicImport(() => import("@/components/World3D"), {
  ssr: false,
  loading: () => <div className="readout world-loading">// cargando el planeta…</div>,
});
const Notebook3D = dynamicImport(() => import("@/components/Notebook3D"), { ssr: false });

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
  const [selected, setSelected] = useState<FailureMarker | null>(null);
  const data = failures as ExternalFailureRaw[];
  const info = useMemo(
    () => (selected ? data.find((f) => f.company === selected.company) ?? null : null),
    [selected, data]
  );

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
        <span className="ok">&gt; el mundo de los fracasos</span> · {MARKERS.length} sedes reales ·
        toca un marcador ámbar
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
        <World3D selected={selected} onSelect={setSelected} />
      </div>

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
                {info.years} · {selected.city}
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

      <section className="section world-cta">
        <div className="world-cta-grid">
          <div className="world-notebook">
            <Notebook3D />
          </div>
          <div>
            <div className="kicker">// tu turno</div>
            <h2 className="world-cta-title">¿Tu proyecto repetirá la historia?</h2>
            <p className="lede prose">
              Describe lo que vas a construir y el agente lo contrasta contra esta memoria —
              antes de que tu sede sea otra luz ámbar.
            </p>
            <div className="controls">
              <Link href="/">
                <button className="primary">[ ejecutar pre-mortem ]</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="footer">
        Globo construido con las texturas 3D del proyecto (albedo, relieve, nubes, luces
        nocturnas). <b>MICROSOFT AGENTS LEAGUE</b> · TRACK REASONING AGENTS.
      </div>
    </div>
  );
}
