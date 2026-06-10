"use client";

import Link from "next/link";
import dynamicImport from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { EASE, Reveal } from "@/components/motion";
import type { PreMortemReport } from "@/lib/types";

// El reporte (la parte más pesada de la UI) se carga bajo demanda: la página
// inicial baja menos JS y el bundle del reporte llega mientras el agente analiza.
const Report = dynamicImport(() => import("@/components/Report"), {
  loading: () => <div className="readout section">// cargando reporte…</div>,
});

const MAX_QUERY = 1500; // límite real del Copilot Retrieval API (queryString)

const STAGES = [
  "perfilando el proyecto",
  "recuperando memoria institucional",
  "mapeando riesgos a casos reales",
  "rankeando por severidad histórica",
];

const PRESETS: { label: string; text: string }[] = [
  {
    label: "app delivery",
    text: "Vamos a lanzar una app móvil de delivery propia para una cadena de restaurantes grande, para dejar de pagar comisiones a los marketplaces. La fecha de lanzamiento está atada a una campaña de marketing nacional, así que es fija. El equipo es nuevo en este dominio y la apuesta es crecer rápido en adopción ofreciendo descuentos. Necesitamos tracking del pedido en tiempo real.",
  },
  {
    label: "marketplace B2B",
    text: "Queremos construir un marketplace que conecte proveedores y compradores industriales. Es una apuesta de plataforma de dos lados y el equipo es nuevo. El plan es construir las features de la plataforma y que proveedores y compradores lleguen solos.",
  },
  {
    label: "chatbot IA soporte",
    text: "Vamos a poner un chatbot con IA generativa para resolver tickets de soporte de nivel 1 y reducir el costo del call center. La apuesta es eficiencia. El equipo es nuevo en LLMs y asumimos que el modelo ya responde bien sobre nuestros productos.",
  },
  {
    label: "migración cloud",
    text: "Vamos a migrar el stack on-premise de una aseguradora a la nube para reducir costos de datacenter. Lo vemos como un lift and shift con un proveedor externo, y esperamos ver el ahorro el primer trimestre.",
  },
];

const DEPTHS = [
  { key: "rapido", label: "rápido", hint: "3 riesgos, top 6 casos" },
  { key: "estandar", label: "estándar", hint: "6 riesgos, top 10 casos" },
  { key: "profundo", label: "profundo", hint: "10 riesgos, top 16 casos" },
] as const;

export default function Home() {
  const [description, setDescription] = useState("");
  const [depth, setDepth] = useState<string>("estandar");
  const [report, setReport] = useState<PreMortemReport | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [listening, setListening] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recRef = useRef<any>(null);
  const reportAnchor = useRef<HTMLDivElement>(null);

  // Al llegar el reporte, llevar al usuario directo al dictamen.
  useEffect(() => {
    if (report) reportAnchor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report]);

  /** Dictado por voz (Web Speech API, es). Si el navegador no lo trae, se avisa. */
  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Este navegador no soporta dictado por voz — escribe la descripción.");
      return;
    }
    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<any>)
        .slice(e.resultIndex)
        .map((r: any) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) setDescription((d) => (d ? d.trimEnd() + " " : "") + text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setError(null);
    rec.start();
    setListening(true);
  }

  useEffect(() => {
    if (loading) {
      setStage(0);
      timerRef.current = setInterval(() => {
        setStage((s) => Math.min(s + 1, STAGES.length - 1));
      }, 650);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading]);

  async function generate() {
    if (description.trim().length < 20 || loading) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/premortem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, depth }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error desconocido");
      setCached(res.headers.get("X-Cache") === "HIT");
      setReport(data as PreMortemReport);
    } catch (e: any) {
      setError(e?.message ?? "Error generando el pre-mortem.");
    } finally {
      setLoading(false);
    }
  }

  const over = description.length > MAX_QUERY;

  return (
    <div className="shell">
      <div className="sysbar">
        <div className="brand">
          PRE-MORTEM<b>/</b>INSTITUCIONAL
        </div>
        <div className="sys-right">
          <Link href="/memoria" className="syslink">
            // archivo
          </Link>
          <Link href="/portafolio" className="syslink">
            // portafolio
          </Link>
          <Link href="/informes" className="syslink">
            // informes
          </Link>
          <span>rev 1.0</span>
        </div>
      </div>

      <div className="statusline">
        {loading ? (
          <>
            <span className="run">&gt; {STAGES[stage]}…</span>
            <span className="cursor" />
          </>
        ) : report ? (
          <>
            <span className="ok">&gt; análisis completo</span>
            {cached && <span className="ok"> · instantáneo (caché)</span>} · {report.casesInspected}{" "}
            casos inspeccionados · motor {report.generatedWith} · memoria {report.retrieverUsed}
            {report.id && (
              <>
                {" · "}
                <Link className="syslink" href={`/informe/${report.id}`}>
                  permalink ↗
                </Link>
              </>
            )}
          </>
        ) : (
          <>
            &gt; sistema listo — pega la descripción del proyecto para iniciar el pre-mortem
            <span className="cursor" />
          </>
        )}
      </div>

      <Hero />

      <section className="section no-print" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="howto">
            <div className="howto-step">
              <span className="howto-n">01</span> describe tu proyecto
              <small>en tus palabras, o díctalo</small>
            </div>
            <div className="howto-step">
              <span className="howto-n">02</span> el agente recuerda
              <small>busca proyectos pasados que fracasaron parecido</small>
            </div>
            <div className="howto-step">
              <span className="howto-n">03</span> decide con evidencia
              <small>cada riesgo trae su caso real y su mitigación</small>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section no-print">
        <div className="field-head">
          <span>&gt; describe_el_proyecto</span>
          <span className={over ? "over" : undefined}>
            {description.length} / {MAX_QUERY}
          </span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              generate();
            }
          }}
          spellCheck={false}
          aria-label="Describe el proyecto que estás por lanzar"
          placeholder="// ej: vamos a lanzar una plataforma B2B que conecta proveedores y compradores industriales…"
        />

        <div className="presets">
          <span className="presets-label">// ejemplos:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className="chip-btn"
              onClick={() => setDescription(p.text)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
          <button
            className={`chip-btn ${listening ? "on" : ""}`}
            onClick={toggleMic}
            disabled={loading}
            aria-pressed={listening}
            title="Dictar la descripción por voz"
          >
            {listening ? "● grabando… (tocar para parar)" : "🎤 dictar"}
          </button>
        </div>

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
        </div>

        <div className="controls">
          <button className="primary" onClick={generate} disabled={loading || description.trim().length < 20}>
            {loading ? (
              <>
                <span className="spinner" />
                ejecutando…
              </>
            ) : (
              "[ ejecutar pre-mortem ]"
            )}
          </button>
          {description && (
            <button onClick={() => setDescription("")} disabled={loading}>
              [ limpiar ]
            </button>
          )}
          <span className="hint">⌘/Ctrl + Enter</span>
        </div>
        {error && <div className="error">{error}</div>}
      </section>

      <div ref={reportAnchor} />
      {report && <Report report={report} />}

      <div className="footer">
        <b>MICROSOFT AGENTS LEAGUE</b> · TRACK REASONING AGENTS · memoria vía interfaz tipo
        Microsoft Work IQ — recuperador <b>{report?.retrieverUsed ?? "synthetic"}</b> · razonamiento{" "}
        <b>{report?.generatedWith ?? "stub"}</b>
      </div>
    </div>
  );
}

function Hero() {
  // Parallax sutil: el titular y el kicker se desplazan a velocidades distintas
  // al hacer scroll, como capas de un expediente que se separan.
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yTitle = useTransform(scrollYProgress, [0, 1], [0, -64]);
  const yKicker = useTransform(scrollYProgress, [0, 1], [0, -26]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: EASE },
        };

  return (
    <section className="section hero3d" ref={ref}>
      {/* piso en perspectiva: rejilla 3D que se aleja hacia el horizonte */}
      <div className="hero-floor" aria-hidden="true" />
      <motion.div style={reduce ? undefined : { y: yKicker, opacity: fade }}>
        <motion.div className="kicker" {...enter(0.05)}>
          // memoria institucional · análisis de modos de fallo
        </motion.div>
      </motion.div>
      <motion.div style={reduce ? undefined : { y: yTitle, opacity: fade }}>
        <h1 className="manifesto">
          <motion.span style={{ display: "block" }} {...enter(0.15)}>
            No se predice.
          </motion.span>
          <motion.span className="dim" style={{ display: "block" }} {...enter(0.32)}>
            Se recuerda.
          </motion.span>
        </h1>
      </motion.div>
      <motion.p className="lede prose" {...enter(0.5)}>
        Describe el proyecto que estás por lanzar. El agente recupera de la memoria de la empresa
        los proyectos pasados similares y deriva cómo podría fallar este —{" "}
        <b>cada riesgo anclado a un caso real que puedes abrir y verificar.</b>
      </motion.p>
    </section>
  );
}
