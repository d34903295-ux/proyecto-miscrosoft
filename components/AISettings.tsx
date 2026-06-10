"use client";

// Configuración de IA desde el frontend (BYOK · OpenRouter).
//
// El usuario pega su API key de OpenRouter y elige modelo; se guarda SOLO en
// localStorage del navegador y viaja por header en cada análisis. El servidor
// nunca la persiste ni la loguea. Sin key, el demo sigue corriendo con el
// motor stub determinista.

import { useEffect, useState } from "react";

const LS_KEY = "premortem-openrouter";

export interface ORConfig {
  key: string;
  model: string;
}

export function loadORConfig(): ORConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { model: "openai/gpt-4o-mini", ...JSON.parse(raw) };
  } catch {
    // localStorage corrupto o inaccesible → config vacía
  }
  return { key: "", model: "openai/gpt-4o-mini" };
}

/** Headers BYOK para fetch de análisis. Vacío si no hay key configurada. */
export function llmHeaders(): Record<string, string> {
  const cfg = loadORConfig();
  if (!cfg.key) return {};
  return {
    "x-llm-provider": "openrouter",
    "x-llm-key": cfg.key,
    "x-llm-model": cfg.model,
  };
}

const MODELS = [
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4.6",
  "meta-llama/llama-3.3-70b-instruct",
  "google/gemini-2.5-flash",
];

export default function AISettings() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cfg = loadORConfig();
    setKey(cfg.key);
    setModel(cfg.model);
  }, []);

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify({ key: key.trim(), model }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function clear() {
    localStorage.removeItem(LS_KEY);
    setKey("");
    setModel("openai/gpt-4o-mini");
  }

  const active = key.trim().length > 0;

  return (
    <div className="aiset">
      <button className="collapse-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>// configurar IA · OpenRouter (tu propia key)</span>
        <span className="collapse-meta">
          {active ? <b style={{ color: "var(--green)" }}>● activa</b> : "stub determinista"}{" "}
          <b>{open ? "[−]" : "[+]"}</b>
        </span>
      </button>
      {open && (
        <div className="aiset-body">
          <p className="lede prose" style={{ marginTop: 0 }}>
            Pega tu API key de{" "}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
              openrouter.ai/keys
            </a>{" "}
            para razonar con un LLM real (cientos de modelos, una sola key). Se guarda solo en{" "}
            <b>tu navegador</b> y viaja por header en cada análisis — el servidor no la almacena.
            Sin key, el agente usa el motor stub determinista.
          </p>
          <div className="aiset-row">
            <label className="aiset-label" htmlFor="or-key">api key</label>
            <input
              id="or-key"
              className="search"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="aiset-row">
            <label className="aiset-label" htmlFor="or-model">modelo</label>
            <select
              id="or-model"
              className="search"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="controls" style={{ marginTop: 10 }}>
            <button className="primary" onClick={save} disabled={!key.trim()}>
              {saved ? "[ guardada ✓ ]" : "[ guardar key ]"}
            </button>
            {active && <button onClick={clear}>[ quitar key ]</button>}
          </div>
        </div>
      )}
    </div>
  );
}
