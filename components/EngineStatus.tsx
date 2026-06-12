"use client";

// Estado REAL del motor de razonamiento: qué modelo está configurado en el
// servidor (GitHub Models / Foundry / Azure…), si respondió la última llamada
// y cuántas peticiones de cuota quedan según los headers del gateway.
// Sustituye al antiguo panel BYOK: aquí no hay keys del usuario — el motor
// vive en el servidor y este panel solo OBSERVA su estado real.

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

interface Status {
  provider: string;
  label: string;
  model: string | null;
  configured: boolean;
  active: boolean | null;
  lastError: string | null;
  remainingRequests: number | null;
  limitRequests: number | null;
  lastCallAt: string | null;
  calls: number;
}

const TXT = {
  title: { es: "// motor de razonamiento · estado real", en: "// reasoning engine · live status" },
  model: { es: "modelo", en: "model" },
  state: { es: "estado", en: "status" },
  activeYes: { es: "● activo — respondió la última llamada", en: "● active — last call succeeded" },
  activeNo: { es: "○ con error en la última llamada", en: "○ last call failed" },
  activeUnknown: { es: "◌ sin llamadas aún en este proceso", en: "◌ no calls yet in this process" },
  notConfigured: { es: "sin configurar (cae a stub)", en: "not configured (falls back to stub)" },
  remaining: { es: "peticiones restantes (cuota)", en: "requests remaining (quota)" },
  calls: { es: "llamadas reales servidas", en: "real calls served" },
  check: { es: "[ verificar en vivo ]", en: "[ check live ]" },
  checking: { es: "verificando…", en: "checking…" },
  unknown: { es: "— (el gateway aún no lo reportó)", en: "— (gateway hasn't reported it yet)" },
} as const;

export default function EngineStatus({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);
  const t = (k: keyof typeof TXT) => TXT[k][lang];

  const load = useCallback(async (ping: boolean) => {
    try {
      if (ping) setChecking(true);
      const res = await fetch(`/api/llm-status${ping ? "?ping=1" : ""}`);
      if (res.ok) setSt((await res.json()) as Status);
    } catch {
      /* sin red: el panel simplemente no actualiza */
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const dot =
    st?.active === true ? "var(--green)" : st?.active === false ? "var(--red)" : "var(--dim)";
  const headline = st
    ? `${st.label}${st.model ? ` · ${st.model}` : ""}`
    : "…";

  return (
    <div className="aiset">
      <button className="collapse-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{t("title")}</span>
        <span className="collapse-meta">
          <b style={{ color: dot }}>
            {st?.active === true ? "● " : st?.active === false ? "○ " : "◌ "}
          </b>
          {st?.provider ?? "…"} <b>{open ? "[−]" : "[+]"}</b>
        </span>
      </button>
      {open && st && (
        <div className="aiset-body">
          <div className="field">
            <div className="label">{t("model")}</div>
            <div className="val">{st.configured ? headline : t("notConfigured")}</div>
          </div>
          <div className="field">
            <div className="label">{t("state")}</div>
            <div className="val" style={{ color: dot }}>
              {st.active === true
                ? t("activeYes")
                : st.active === false
                  ? `${t("activeNo")}${st.lastError ? ` — ${st.lastError}` : ""}`
                  : t("activeUnknown")}
            </div>
          </div>
          <div className="field">
            <div className="label">{t("remaining")}</div>
            <div className="val">
              {st.remainingRequests != null
                ? `${st.remainingRequests}${st.limitRequests != null ? ` / ${st.limitRequests}` : ""}`
                : t("unknown")}
            </div>
          </div>
          <div className="field">
            <div className="label">{t("calls")}</div>
            <div className="val">{st.calls}</div>
          </div>
          <div className="controls" style={{ marginTop: 10 }}>
            <button className="primary" onClick={() => load(true)} disabled={checking}>
              {checking ? TXT.checking[lang] : t("check")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
