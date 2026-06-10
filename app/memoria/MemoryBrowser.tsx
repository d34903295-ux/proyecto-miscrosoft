"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PastProjectRecord } from "@/lib/types";

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function sevLevel(severity: number): "high" | "mid" | "low" {
  if (severity >= 4) return "high";
  if (severity === 3) return "mid";
  return "low";
}

export default function MemoryBrowser({ records }: { records: PastProjectRecord[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [client, setClient] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(records.map((r) => r.failureCategory))).sort(),
    [records]
  );
  const clients = useMemo(
    () => Array.from(new Set(records.map((r) => r.clientType))).sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return records.filter((r) => {
      if (cat && r.failureCategory !== cat) return false;
      if (client && r.clientType !== client) return false;
      if (!nq) return true;
      const hay = norm(
        [
          r.name,
          r.description,
          r.assumption,
          r.whatWentWrong,
          r.failureCategory,
          r.tech.join(" "),
          r.marketBet,
          r.teamDynamics,
          r.outcome,
        ].join(" ")
      );
      return hay.includes(nq);
    });
  }, [records, q, cat, client]);

  return (
    <section className="section">
      <div className="field-head">
        <span>&gt; buscar_en_la_memoria</span>
        <span>
          {filtered.length} / {records.length}
        </span>
      </div>
      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        spellCheck={false}
        aria-label="Buscar en la memoria de la empresa"
        placeholder="// buscar por tecnología, cliente, tipo de fallo, palabra clave…"
      />

      <div className="presets" style={{ marginTop: 12 }}>
        <span className="presets-label">// categoría:</span>
        <button
          className={`chip-btn ${!cat ? "on" : ""}`}
          aria-pressed={!cat}
          onClick={() => setCat(null)}
        >
          todas
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`chip-btn ${cat === c ? "on" : ""}`}
            aria-pressed={cat === c}
            onClick={() => setCat(cat === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="presets" style={{ marginTop: 8 }}>
        <span className="presets-label">// cliente:</span>
        <button
          className={`chip-btn ${!client ? "on" : ""}`}
          aria-pressed={!client}
          onClick={() => setClient(null)}
        >
          todos
        </button>
        {clients.map((c) => (
          <button
            key={c}
            className={`chip-btn ${client === c ? "on" : ""}`}
            aria-pressed={client === c}
            onClick={() => setClient(client === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="archive">
        {filtered.map((r) => (
          <Link key={r.id} className="arch-card" href={`/case/${r.id}`}>
            <div className="arch-head">
              <span className="arch-id">{r.id}</span>
              <span className="sev-cells" title={`severidad ${r.severity}/5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`sev-cell ${n <= r.severity ? `on-${sevLevel(r.severity)}` : ""}`}
                  />
                ))}
              </span>
            </div>
            <div className="arch-name">{r.name}</div>
            <div className="arch-cat">{r.failureCategory}</div>
            <div className="arch-snippet prose">{r.whatWentWrong}</div>
            <div className="tags" style={{ marginTop: 10 }}>
              <span className="tag">
                <b>cliente</b> {r.clientType}
              </span>
              {r.tech.slice(0, 2).map((t) => (
                <span className="tag" key={t}>
                  <b>tech</b> {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="readout" style={{ marginTop: 20, gridColumn: "1 / -1" }}>
            // sin resultados{q ? ` para «${q}»` : ""}
            {cat || client ? " con los filtros actuales" : ""}
          </div>
        )}
      </div>
    </section>
  );
}
