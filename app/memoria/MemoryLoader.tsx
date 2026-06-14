"use client";

// Panel visible para CARGAR la memoria institucional de tu empresa:
//  · Importar CSV masivo  → POST /api/memory/import
//  · Agregar un caso      → POST /api/memory
//  · Descargar plantilla CSV
// Hace tangible el concepto B2B: aquí una empresa sube su propia historia.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VALID_TECH, VALID_MARKET, VALID_TEAM, VALID_CLIENT, VALID_CATEGORY } from "@/lib/validate";

const TEMPLATE =
  "name,year,clientType,tech,marketBet,teamDynamics,description,assumption,whatWentWrong,ignoredSignals,outcome,severity,failureCategory,mitigation\n" +
  '"Atlas — portal de autoservicio",2022,enterprise,web|API/plataforma,plataforma/escala,multi-equipo,' +
  '"Portal de autoservicio para clientes enterprise.","Que preferirían autoservicio a soporte humano.",' +
  '"Adopción mínima; los clientes seguían llamando al call center.",' +
  '"No se midió la disposición al autoservicio|Se asumió adopción sin piloto",' +
  '"Se reabrió el call center; el portal quedó subutilizado.",3,Adopción/onboarding,' +
  '"Pilotar con usuarios reales y medir adopción antes de escalar."';

function download(name: string, text: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

interface Panel {
  open: string | null;
  set: (s: string | null) => void;
}
function Section({ id, title, hint, panel, children }: { id: string; title: string; hint: string; panel: Panel; children: React.ReactNode }) {
  const open = panel.open === id;
  return (
    <div className="aiset">
      <button className="collapse-head" onClick={() => panel.set(open ? null : id)} aria-expanded={open}>
        <span>{title}</span>
        <span className="collapse-meta">{hint} <b>{open ? "[−]" : "[+]"}</b></span>
      </button>
      {open && <div className="aiset-body">{children}</div>}
    </div>
  );
}

const EMPTY = {
  name: "", year: new Date().getFullYear() - 1, clientType: "startup",
  tech: [] as string[], marketBet: "nuevo mercado", teamDynamics: "equipo nuevo",
  description: "", assumption: "", whatWentWrong: "", ignoredSignals: "",
  outcome: "", severity: 3, failureCategory: "Adopción/onboarding", mitigation: "",
};

export default function MemoryLoader() {
  const router = useRouter();
  const [panel, setPanelState] = useState<string | null>(null);
  const set = (s: string | null) => setPanelState(s);

  // ── CSV ──
  const [csv, setCsv] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvMsg, setCsvMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function importCsv() {
    if (!csv.trim() || csvBusy) return;
    setCsvBusy(true);
    setCsvMsg(null);
    try {
      const res = await fetch("/api/memory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const d = await res.json();
      if (res.ok || d.added > 0) {
        setCsvMsg({ ok: true, text: `Importados ${d.added} caso(s)${d.rejected ? ` · ${d.rejected} rechazado(s)` : ""}. La memoria ya los puede recuperar.` });
        setCsv("");
        router.refresh();
      } else {
        const first = d.errors?.[0]?.problems?.join("; ") ?? d.error ?? "Error";
        setCsvMsg({ ok: false, text: `Nada importado. ${first}` });
      }
    } catch {
      setCsvMsg({ ok: false, text: "Error de red." });
    } finally {
      setCsvBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(setCsv);
  }

  // ── caso a mano ──
  const [form, setForm] = useState({ ...EMPTY });
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const upd = (k: keyof typeof EMPTY, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTech = (t: string) =>
    setForm((f) => ({ ...f, tech: f.tech.includes(t) ? f.tech.filter((x) => x !== t) : [...f.tech, t] }));

  async function addCase() {
    if (addBusy) return;
    setAddBusy(true);
    setAddMsg(null);
    try {
      const body = {
        ...form,
        year: Number(form.year),
        severity: Number(form.severity),
        ignoredSignals: form.ignoredSignals.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setAddMsg({ ok: true, text: `Caso «${d.added}» agregado. Ya es recuperable en el siguiente pre-mortem.` });
        setForm({ ...EMPTY });
        router.refresh();
      } else {
        setAddMsg({ ok: false, text: (d.details?.[0] ?? d.error ?? "Caso inválido") as string });
      }
    } catch {
      setAddMsg({ ok: false, text: "Error de red." });
    } finally {
      setAddBusy(false);
    }
  }

  const p: Panel = { open: panel, set };

  return (
    <section className="section no-print">
      <div className="field-head">
        <span>// cargar la memoria de tu empresa</span>
        <span>aquí entra tu historia</span>
      </div>
      <p className="lede prose" style={{ marginTop: 0 }}>
        El agente solo recuerda lo que le cargas. Sube los <b>postmortems de tu empresa</b> (CSV) o
        agrega un caso a mano — entran al índice y son <b>recuperables al instante</b> en el siguiente
        pre-mortem. (En producción se conectan vía <b>Foundry IQ</b>.)
      </p>

      <Section id="csv" title="// importar CSV (masivo)" hint="hasta 200 filas" panel={p}>
        <p className="aiset-hint prose">
          Una fila por postmortem. Cabecera con los campos del caso; <code>tech</code> e{" "}
          <code>ignoredSignals</code> separados por <code>|</code> dentro de la celda.
        </p>
        <div className="controls" style={{ marginBottom: 10 }}>
          <button onClick={() => download("plantilla-memoria.csv", TEMPLATE)}>[ descargar plantilla ]</button>
          <label className="chip-btn" style={{ cursor: "pointer" }}>
            [ elegir archivo .csv ]
            <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }} />
          </label>
        </div>
        <textarea
          className="search"
          style={{ width: "100%", minHeight: 130, fontFamily: "var(--mono)" }}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"name,year,clientType,tech,marketBet,...\n\"Caso\",2022,startup,web|IA/ML,..."}
          spellCheck={false}
        />
        <div className="controls" style={{ marginTop: 10 }}>
          <button className="primary" onClick={importCsv} disabled={csvBusy || !csv.trim()}>
            {csvBusy ? "importando…" : "[ importar a la memoria ]"}
          </button>
        </div>
        {csvMsg && <div className={csvMsg.ok ? "feedback-thanks" : "error"} style={{ marginTop: 10 }}>{csvMsg.text}</div>}
      </Section>

      <Section id="one" title="// agregar un caso a mano" hint="1 postmortem" panel={p}>
        <div className="mem-form">
          <label className="mf">name<input className="search" value={form.name} onChange={(e) => upd("name", e.target.value)} placeholder="Atlas — portal de autoservicio" /></label>
          <label className="mf mf-sm">year<input className="search" type="number" value={form.year} onChange={(e) => upd("year", e.target.value)} /></label>
          <label className="mf mf-sm">severity (1-5)<input className="search" type="number" min={1} max={5} value={form.severity} onChange={(e) => upd("severity", e.target.value)} /></label>
          <label className="mf mf-sm">clientType
            <select className="search" value={form.clientType} onChange={(e) => upd("clientType", e.target.value)}>{VALID_CLIENT.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="mf mf-sm">marketBet
            <select className="search" value={form.marketBet} onChange={(e) => upd("marketBet", e.target.value)}>{VALID_MARKET.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="mf mf-sm">teamDynamics
            <select className="search" value={form.teamDynamics} onChange={(e) => upd("teamDynamics", e.target.value)}>{VALID_TEAM.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="mf mf-sm">failureCategory
            <select className="search" value={form.failureCategory} onChange={(e) => upd("failureCategory", e.target.value)}>{VALID_CATEGORY.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
        </div>
        <div className="mf-tech">
          <span className="aiset-label">tech</span>
          <div className="presets" style={{ marginTop: 6 }}>
            {VALID_TECH.map((t) => (
              <button key={t} type="button" className={`chip-btn ${form.tech.includes(t) ? "on" : ""}`} onClick={() => toggleTech(t)}>{t}</button>
            ))}
          </div>
        </div>
        <label className="mf mf-full">description<textarea className="search" value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="Qué era el proyecto…" /></label>
        <label className="mf mf-full">assumption (la apuesta)<textarea className="search" value={form.assumption} onChange={(e) => upd("assumption", e.target.value)} placeholder="El supuesto central…" /></label>
        <label className="mf mf-full">whatWentWrong<textarea className="search" value={form.whatWentWrong} onChange={(e) => upd("whatWentWrong", e.target.value)} placeholder="Qué salió mal…" /></label>
        <label className="mf mf-full">ignoredSignals (una por línea)<textarea className="search" value={form.ignoredSignals} onChange={(e) => upd("ignoredSignals", e.target.value)} placeholder={"Señal ignorada 1\nSeñal ignorada 2"} /></label>
        <label className="mf mf-full">outcome<textarea className="search" value={form.outcome} onChange={(e) => upd("outcome", e.target.value)} placeholder="El resultado…" /></label>
        <label className="mf mf-full">mitigation (la lección)<textarea className="search" value={form.mitigation} onChange={(e) => upd("mitigation", e.target.value)} placeholder="Qué se debió hacer…" /></label>
        <div className="controls" style={{ marginTop: 10 }}>
          <button className="primary" onClick={addCase} disabled={addBusy}>{addBusy ? "agregando…" : "[ agregar a la memoria ]"}</button>
        </div>
        {addMsg && <div className={addMsg.ok ? "feedback-thanks" : "error"} style={{ marginTop: 10 }}>{addMsg.text}</div>}
      </Section>
    </section>
  );
}
