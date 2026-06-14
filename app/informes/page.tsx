// Historial de informes persistidos, más recientes primero.

import Link from "next/link";
import type { PreMortemReport } from "@/lib/types";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function InformesPage() {
  const entries = getStore().list<PreMortemReport>("informes", 100);
  // memoria evolutiva: precisión histórica de los riesgos ya contrastados
  const fb = getStore().list<{ occurred: boolean }>("feedback", 1000);
  const accuracy = fb.length
    ? Math.round((fb.filter((e) => e.doc.occurred).length / fb.length) * 100)
    : null;

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
          <span>rev 1.4</span>
        </div>
      </div>

      <div className="statusline">
        <span className="ok">&gt; historial de informes</span> · {entries.length} persistidos
        {accuracy !== null && (
          <>
            {" · "}precisión histórica: <span className="ok">{accuracy}%</span> ({fb.length} riesgos
            contrastados)
          </>
        )}
      </div>

      <section className="section">
        <div className="kicker">// historial · cada pre-mortem generado queda en el registro</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(28px, 5vw, 52px)" }}>
          Informes
        </h1>
        <p className="lede prose">
          Todos los pre-mortems generados, persistidos con permalink. Un pre-mortem que nadie
          relee no previene nada: aquí queda el registro para contrastar contra la realidad.
        </p>
      </section>

      <section className="section">
        {entries.length === 0 ? (
          <div className="readout">
            // aún no hay informes — genera el primero en la página principal
          </div>
        ) : (
          <div className="insp-list">
            {entries.map(({ id, doc }) => (
              <Link key={id} className="insp-row inc" href={`/informe/${id}`}>
                <span className="insp-flag">{doc.verdict.riskIndex}/100</span>
                <span className="insp-name">
                  {doc.profile.summary}
                  <span className="insp-year"> · {fmtDate(doc.generatedAt)}</span>
                </span>
                <span className="insp-score">{doc.verdict.level}</span>
                <span className="insp-reason">
                  {doc.risks.length} riesgos · {doc.generatedWith}/{doc.retrieverUsed}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="footer">
        Historial persistido en el DocumentStore local (intercambiable por Azure Cosmos DB /
        Table Storage vía la misma interfaz).
      </div>
    </div>
  );
}
