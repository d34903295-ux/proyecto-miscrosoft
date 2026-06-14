// Historial de informes persistidos, más recientes primero.

import Link from "next/link";
import type { PreMortemReport } from "@/lib/types";
import { getStore } from "@/lib/store";
import { getServerLang, makeTr } from "@/lib/serverlang";

export const dynamic = "force-dynamic";

function fmtDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleString(lang === "en" ? "en-US" : "es", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function InformesPage() {
  const lang = getServerLang();
  const tr = makeTr(lang);
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
            &lt;&lt; {tr("volver", "back")}
          </Link>
          <span>rev 1.4</span>
        </div>
      </div>

      <div className="statusline">
        <span className="ok">&gt; {tr("historial de informes", "report history")}</span> · {entries.length}{" "}
        {tr("persistidos", "saved")}
        {accuracy !== null && (
          <>
            {" · "}
            {tr("precisión histórica:", "historical accuracy:")} <span className="ok">{accuracy}%</span> ({fb.length}{" "}
            {tr("riesgos contrastados", "risks checked")})
          </>
        )}
      </div>

      <section className="section">
        <div className="kicker">{tr("// historial · cada pre-mortem generado queda en el registro", "// history · every pre-mortem generated stays on record")}</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(28px, 5vw, 52px)" }}>
          {tr("Informes", "Reports")}
        </h1>
        <p className="lede prose">
          {tr(
            "Todos los pre-mortems generados, persistidos con permalink. Un pre-mortem que nadie relee no previene nada: aquí queda el registro para contrastar contra la realidad.",
            "Every pre-mortem generated, saved with a permalink. A pre-mortem nobody re-reads prevents nothing: this is the record to check against reality."
          )}
        </p>
      </section>

      <section className="section">
        {entries.length === 0 ? (
          <div className="readout">
            {tr("// aún no hay informes — genera el primero en la página principal", "// no reports yet — generate the first on the home page")}
          </div>
        ) : (
          <div className="insp-list">
            {entries.map(({ id, doc }) => (
              <Link key={id} className="insp-row inc" href={`/informe/${id}`}>
                <span className="insp-flag">{doc.verdict.riskIndex}/100</span>
                <span className="insp-name">
                  {doc.profile.summary}
                  <span className="insp-year"> · {fmtDate(doc.generatedAt, lang)}</span>
                </span>
                <span className="insp-score">{doc.verdict.level}</span>
                <span className="insp-reason">
                  {doc.risks.length} {tr("riesgos", "risks")} · {doc.generatedWith}/{doc.retrieverUsed}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="footer">
        {tr(
          "Historial persistido en el DocumentStore local (intercambiable por Azure Cosmos DB / Table Storage vía la misma interfaz).",
          "History persisted in the local DocumentStore (swappable for Azure Cosmos DB / Table Storage via the same interface)."
        )}
      </div>
    </div>
  );
}
