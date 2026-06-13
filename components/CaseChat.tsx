"use client";

// "Interrogá la evidencia": chat grounded sobre un expediente. El modelo de
// Foundry responde SOLO con lo que dice el caso; si no está, dice "No consta en
// el expediente". Demuestra recuerda-no-inventa en modo conversacional.

import { useRef, useState } from "react";

interface Turn {
  q: string;
  a: string | null;
  grounded?: boolean;
  provider?: string;
  loading?: boolean;
}

const SUGGESTED = [
  "¿Cuál fue la causa raíz del fracaso?",
  "¿Qué señal se ignoró primero?",
  "¿Qué habrían debido hacer distinto?",
  "¿Cuánto capital se perdió?",
];

export default function CaseChat({ caseId }: { caseId: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setInput("");
    setTurns((t) => [...t, { q, a: null, loading: true }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, question: q }),
      });
      const data = await res.json();
      setTurns((t) =>
        t.map((turn, i) =>
          i === t.length - 1
            ? { q, a: res.ok ? data.answer : data.error ?? "Error", grounded: data.grounded, provider: data.provider, loading: false }
            : turn
        )
      );
    } catch {
      setTurns((t) =>
        t.map((turn, i) => (i === t.length - 1 ? { ...turn, a: "Error de red.", loading: false } : turn))
      );
    } finally {
      setBusy(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
    }
  }

  return (
    <section className="section">
      <div className="field-head">
        <span>// interrogá la evidencia</span>
        <span>grounded · recuerda, no inventa</span>
      </div>
      <p className="lede prose" style={{ marginTop: 0 }}>
        Pregúntale a este expediente. El modelo de Microsoft Foundry responde{" "}
        <b>solo con lo que dice el caso</b>; si la respuesta no está aquí, lo dice — no inventa.
      </p>

      {turns.length > 0 && (
        <div className="chat-log" ref={listRef}>
          {turns.map((t, i) => (
            <div key={i} className="chat-turn">
              <div className="chat-q">
                <span className="chat-tag">tú</span> {t.q}
              </div>
              <div className="chat-a">
                <span className="chat-tag amber">archivo</span>{" "}
                {t.loading ? <span className="chat-typing">consultando el expediente…</span> : t.a}
                {!t.loading && t.a && (
                  <div className="chat-meta">
                    {t.grounded ? `vía modelo Foundry (${t.provider})` : "respuesta extractiva (sin modelo)"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="presets" style={{ marginTop: 12 }}>
        <span className="presets-label">// sugeridas:</span>
        {SUGGESTED.map((s) => (
          <button key={s} className="chip-btn" onClick={() => ask(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>

      <div className="controls" style={{ marginTop: 10 }}>
        <input
          className="search"
          style={{ flex: 1, minWidth: 200 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask(input);
          }}
          placeholder="// escribe tu pregunta sobre este caso…"
          aria-label="Pregunta sobre el expediente"
        />
        <button className="primary" onClick={() => ask(input)} disabled={busy || input.trim().length < 3}>
          {busy ? "…" : "[ preguntar ]"}
        </button>
      </div>
    </section>
  );
}
