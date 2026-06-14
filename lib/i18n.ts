"use client";

// ─────────────────────────────────────────────────────────────
// Idioma de la interfaz (es | en). El contenido del informe se genera en
// español — el idioma del archivo institucional — y eso se declara en la UI
// cuando el idioma es inglés (honestidad: interfaz EN, evidencia ES).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export type Lang = "es" | "en";
const LS_KEY = "premortem-lang";

/** Persiste el idioma en cookie también, para que las páginas de servidor
 *  (que no ven localStorage) rendericen en el mismo idioma. */
function persist(l: Lang) {
  try {
    localStorage.setItem(LS_KEY, l);
  } catch {
    /* sin localStorage */
  }
  try {
    document.cookie = `${LS_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* sin document */
  }
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("es");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved === "en" || saved === "es") {
        setLangState(saved);
        persist(saved); // asegura la cookie para el servidor
      } else {
        const auto = navigator.language && !navigator.language.toLowerCase().startsWith("es") ? "en" : "es";
        setLangState(auto);
        persist(auto);
      }
    } catch {
      /* sin localStorage: queda es */
    }
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    persist(l);
  };
  return [lang, setLang];
}

type Dict = Record<string, { es: string; en: string }>;

const STR: Dict = {
  navArchive: { es: "// archivo", en: "// archive" },
  navWorld: { es: "// mundo 3d", en: "// 3d world" },
  navPortfolio: { es: "// portafolio", en: "// portfolio" },
  navReports: { es: "// informes", en: "// reports" },
  ready: {
    es: "> sistema listo — pega la descripción del proyecto para iniciar el pre-mortem",
    en: "> system ready — paste your project description to run the pre-mortem",
  },
  done: { es: "> análisis completo", en: "> analysis complete" },
  cachedTag: { es: " · instantáneo (caché)", en: " · instant (cache)" },
  inspected: { es: "casos inspeccionados", en: "cases inspected" },
  engine: { es: "motor", en: "engine" },
  memory: { es: "memoria", en: "memory" },
  permalink: { es: "permalink ↗", en: "permalink ↗" },
  kicker: {
    es: "// memoria institucional · análisis de modos de fallo",
    en: "// institutional memory · failure-mode analysis",
  },
  h1a: { es: "No se predice.", en: "It doesn't predict." },
  h1b: { es: "Se recuerda.", en: "It remembers." },
  lede: {
    es: "Describe el proyecto que estás por lanzar. El agente recupera de la memoria de la empresa los proyectos pasados similares y deriva cómo podría fallar este — ",
    en: "Describe the project you're about to launch. The agent retrieves similar past projects from company memory and derives how this one could fail — ",
  },
  ledeBold: {
    es: "cada riesgo anclado a un caso real que puedes abrir y verificar.",
    en: "every risk anchored to a real case you can open and verify.",
  },
  step1: { es: "describe tu proyecto", en: "describe your project" },
  step1s: { es: "en tus palabras, o díctalo", en: "in your own words, or dictate it" },
  step2: { es: "el agente recuerda", en: "the agent remembers" },
  step2s: {
    es: "busca proyectos pasados que fracasaron parecido",
    en: "finds past projects that failed the same way",
  },
  step3: { es: "decide con evidencia", en: "decide with evidence" },
  step3s: {
    es: "cada riesgo trae su caso real y su mitigación",
    en: "each risk ships with its real case and mitigation",
  },
  fieldHead: { es: "> describe_el_proyecto", en: "> describe_the_project" },
  placeholder: {
    es: "// ej: vamos a lanzar una plataforma B2B que conecta proveedores y compradores industriales…",
    en: "// e.g.: we're launching a B2B platform connecting industrial suppliers and buyers…",
  },
  examples: { es: "// ejemplos:", en: "// examples:" },
  dictate: { es: "🎤 dictar", en: "🎤 dictate" },
  recording: { es: "● grabando… (tocar para parar)", en: "● recording… (tap to stop)" },
  depthLabel: { es: "// profundidad:", en: "// depth:" },
  depthFast: { es: "rápido", en: "fast" },
  depthStd: { es: "estándar", en: "standard" },
  depthDeep: { es: "profundo", en: "deep" },
  run: { es: "[ ejecutar pre-mortem ]", en: "[ run pre-mortem ]" },
  running: { es: "ejecutando…", en: "running…" },
  clear: { es: "[ limpiar ]", en: "[ clear ]" },
  reportLangNote: {
    es: "",
    en: "Note: no Foundry model was available to translate, so this report stayed in Spanish (the archive language). Set LLM_PROVIDER=github to get it in English.",
  },
  footerA: { es: "memoria vía Microsoft IQ (Foundry IQ) — recuperador", en: "memory via Microsoft IQ (Foundry IQ) — retriever" },
  footerB: { es: "razonamiento", en: "reasoning" },
  stage1: { es: "perfilando el proyecto", en: "profiling the project" },
  stage2: { es: "recuperando memoria institucional", en: "retrieving institutional memory" },
  stage3: { es: "mapeando riesgos a casos reales", en: "mapping risks to real cases" },
  stage4: { es: "rankeando por severidad histórica", en: "ranking by historical severity" },
  loadingReport: { es: "// cargando reporte…", en: "// loading report…" },
  micUnsupported: {
    es: "Este navegador no soporta dictado por voz — escribe la descripción.",
    en: "This browser doesn't support voice dictation — type the description.",
  },
  localTime: { es: "hora local", en: "local time" },
  ticker: {
    es: "// archivo de fracasos reales · cada uno con fuente verificable",
    en: "// archive of real failures · each with a verifiable source",
  },
  heroCardLabel: { es: "expediente // evidencia real", en: "case file // real evidence" },
  heroCardCta: { es: ">> abrir el archivo completo", en: ">> open the full archive" },
  burned: { es: "capital quemado", en: "capital burned" },
};

export function t(lang: Lang, key: keyof typeof STR): string {
  return STR[key]?.[lang] ?? STR[key]?.es ?? String(key);
}
