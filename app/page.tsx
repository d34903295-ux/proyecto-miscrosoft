"use client";

import Link from "next/link";
import dynamicImport from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { EASE, Reveal } from "@/components/motion";
import type { PreMortemReport } from "@/lib/types";
import EngineStatus from "@/components/EngineStatus";
import Clock from "@/components/Clock";
import ScrollProgress from "@/components/ScrollProgress";
import Tilt from "@/components/Tilt";
import { t, useLang, type Lang } from "@/lib/i18n";
import failures from "@/lib/memory/external_failures.json";

// El reporte (la parte más pesada de la UI) se carga bajo demanda: la página
// inicial baja menos JS y el bundle del reporte llega mientras el agente analiza.
const Report = dynamicImport(() => import("@/components/Report"), {
  loading: () => <div className="readout section">// cargando reporte…</div>,
});

const MAX_QUERY = 1500; // límite real del Copilot Retrieval API (queryString)

const STAGE_KEYS = ["stage1", "stage2", "stage3", "stage4"] as const;

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
  { key: "rapido", labelKey: "depthFast", hint: "3 riesgos, top 6 casos" },
  { key: "estandar", labelKey: "depthStd", hint: "6 riesgos, top 10 casos" },
  { key: "profundo", labelKey: "depthDeep", hint: "10 riesgos, top 16 casos" },
] as const;

export default function Home() {
  const [lang, setLang] = useLang();
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
      setError(t(lang, "micUnsupported"));
      return;
    }
    const rec = new SR();
    rec.lang = lang === "en" ? "en-US" : "es-ES";
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
        setStage((s) => Math.min(s + 1, STAGE_KEYS.length - 1));
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
      <ScrollProgress />
      <div className="sysbar">
        <div className="brand">
          PRE-MORTEM<b>/</b>INSTITUCIONAL
        </div>
        <div className="sys-right">
          <Link href="/memoria" className="syslink">
            {t(lang, "navArchive")}
          </Link>
          <Link href="/mundo" className="syslink">
            {t(lang, "navWorld")}
          </Link>
          <Link href="/portafolio" className="syslink">
            {t(lang, "navPortfolio")}
          </Link>
          <Link href="/informes" className="syslink">
            {t(lang, "navReports")}
          </Link>
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            aria-label={lang === "es" ? "Switch to English" : "Cambiar a español"}
            title={lang === "es" ? "Switch to English" : "Cambiar a español"}
          >
            {lang === "es" ? "ES│en" : "es│EN"}
          </button>
          <Clock lang={lang} />
        </div>
      </div>

      <div className="statusline">
        {loading ? (
          <>
            <span className="run">&gt; {t(lang, STAGE_KEYS[stage])}…</span>
            <span className="cursor" />
          </>
        ) : report ? (
          <>
            <span className="ok">{t(lang, "done")}</span>
            {cached && <span className="ok">{t(lang, "cachedTag")}</span>} · {report.casesInspected}{" "}
            {t(lang, "inspected")} · {t(lang, "engine")} {report.generatedWith} · {t(lang, "memory")}{" "}
            {report.retrieverUsed}
            {report.id && (
              <>
                {" · "}
                <Link className="syslink" href={`/informe/${report.id}`}>
                  {t(lang, "permalink")}
                </Link>
              </>
            )}
          </>
        ) : (
          <>
            {t(lang, "ready")}
            <span className="cursor" />
          </>
        )}
      </div>

      <Hero lang={lang} />

      <section className="section no-print" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="howto">
            <div className="howto-step">
              <span className="howto-n">01</span> {t(lang, "step1")}
              <small>{t(lang, "step1s")}</small>
            </div>
            <div className="howto-step">
              <span className="howto-n">02</span> {t(lang, "step2")}
              <small>{t(lang, "step2s")}</small>
            </div>
            <div className="howto-step">
              <span className="howto-n">03</span> {t(lang, "step3")}
              <small>{t(lang, "step3s")}</small>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section no-print">
        <div className="field-head">
          <span>{t(lang, "fieldHead")}</span>
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
          aria-label={t(lang, "step1")}
          placeholder={t(lang, "placeholder")}
        />

        <div className="presets">
          <span className="presets-label">{t(lang, "examples")}</span>
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
            {listening ? t(lang, "recording") : t(lang, "dictate")}
          </button>
        </div>

        <div className="presets">
          <span className="presets-label">{t(lang, "depthLabel")}</span>
          {DEPTHS.map((d) => (
            <button
              key={d.key}
              className={`chip-btn ${depth === d.key ? "on" : ""}`}
              aria-pressed={depth === d.key}
              onClick={() => setDepth(d.key)}
              disabled={loading}
              title={d.hint}
            >
              {t(lang, d.labelKey)}
            </button>
          ))}
        </div>

        <div className="controls">
          <button className="primary" onClick={generate} disabled={loading || description.trim().length < 20}>
            {loading ? (
              <>
                <span className="spinner" />
                {t(lang, "running")}
              </>
            ) : (
              t(lang, "run")
            )}
          </button>
          {description && (
            <button onClick={() => setDescription("")} disabled={loading}>
              {t(lang, "clear")}
            </button>
          )}
          <span className="hint">⌘/Ctrl + Enter</span>
        </div>
        {error && <div className="error">{error}</div>}

        <EngineStatus lang={lang} />
      </section>

      <div ref={reportAnchor} />
      {report && lang === "en" && (
        <div className="statusline no-print">{t(lang, "reportLangNote")}</div>
      )}
      {report && <Report report={report} />}

      <div className="footer">
        <b>MICROSOFT AGENTS LEAGUE</b> · TRACK REASONING AGENTS · {t(lang, "footerA")}{" "}
        <b>{report?.retrieverUsed ?? "synthetic"}</b> · {t(lang, "footerB")}{" "}
        <b>{report?.generatedWith ?? "stub"}</b>
      </div>
    </div>
  );
}

/** Titular con entrada letra a letra (stagger) — cinemático, estilo «dossier». */
function StaggerLine({
  text,
  className,
  baseDelay,
  reduce,
}: {
  text: string;
  className?: string;
  baseDelay: number;
  reduce: boolean | null;
}) {
  if (reduce) {
    return (
      <span className={className} style={{ display: "block" }}>
        {text}
      </span>
    );
  }
  return (
    <span className={className} style={{ display: "block", whiteSpace: "pre-wrap" }} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          style={{ display: "inline-block" }}
          initial={{ opacity: 0, y: "0.6em", rotateX: -55 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.5, delay: baseDelay + i * 0.028, ease: EASE }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}

function Hero({ lang }: { lang: Lang }) {
  // Parallax: titular y kicker a velocidades distintas; spotlight que sigue el
  // puntero; tarjeta-expediente con tilt 3D; ticker con los fracasos REALES.
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yTitle = useTransform(scrollYProgress, [0, 1], [0, -64]);
  const yKicker = useTransform(scrollYProgress, [0, 1], [0, -26]);
  const yCard = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: EASE },
        };

  // El expediente destacado del hero: Webvan, el fracaso real más icónico del archivo.
  const featured = (failures as any[]).find((f) => f.company === "Webvan") ?? (failures as any[])[0];
  const ticker = (failures as any[]).map((f) => ({ company: f.company, funding: f.funding }));

  return (
    <section
      className="section hero3d"
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`);
        el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`);
      }}
    >
      {/* piso en perspectiva + spotlight que sigue el puntero */}
      <div className="hero-floor" aria-hidden="true" />
      <div className="hero-spot" aria-hidden="true" />

      <div className="hero-grid">
        <div>
          <motion.div style={reduce ? undefined : { y: yKicker, opacity: fade }}>
            <motion.div className="kicker" {...enter(0.05)}>
              {t(lang, "kicker")}
            </motion.div>
          </motion.div>
          <motion.div style={reduce ? undefined : { y: yTitle, opacity: fade }}>
            <h1 className="manifesto">
              <StaggerLine text={t(lang, "h1a")} baseDelay={0.15} reduce={reduce} />
              <StaggerLine text={t(lang, "h1b")} className="dim" baseDelay={0.45} reduce={reduce} />
            </h1>
          </motion.div>
          <motion.p className="lede prose" {...enter(0.75)}>
            {t(lang, "lede")}
            <b>{t(lang, "ledeBold")}</b>
          </motion.p>
        </div>

        {/* expediente flotante con tilt 3D — evidencia REAL del archivo */}
        <motion.div style={reduce ? undefined : { y: yCard }} {...enter(0.6)}>
          <Tilt max={9} className="hero-card-tilt">
            <Link href="/mundo" className="hero-card" aria-label={featured.company}>
              <div className="hero-card-label">{t(lang, "heroCardLabel")}</div>
              <div className="hero-card-co">☠ {featured.company}</div>
              <div className="hero-card-years">{featured.years}</div>
              <div className="hero-card-burn">
                {t(lang, "burned")} <b>{featured.funding}</b>
              </div>
              <div className="hero-card-quote prose">“{featured.lesson}”</div>
              <div className="hero-card-cta">{t(lang, "heroCardCta")}</div>
            </Link>
          </Tilt>
        </motion.div>
      </div>

      {/* ticker infinito: el archivo real desfila como cinta de evidencias */}
      <motion.div className="marquee-wrap" {...enter(0.9)}>
        <div className="readout">{t(lang, "ticker")}</div>
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...ticker, ...ticker].map((f, i) => (
              <span className="marquee-item" key={i}>
                ☠ {f.company} <b>{f.funding}</b>
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
