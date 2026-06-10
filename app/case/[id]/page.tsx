import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecordById } from "@/lib/retrieval";

export const dynamic = "force-dynamic";

export default function CasePage({ params }: { params: { id: string } }) {
  const record = getRecordById(decodeURIComponent(params.id));
  if (!record) return notFound();

  return (
    <div className="shell">
      <div className="sysbar">
        <div className="brand">
          PRE-MORTEM<b>/</b>INSTITUCIONAL
        </div>
        <div className="sys-right">
          <Link href="/" className="back">
            &lt;&lt; volver
          </Link>
        </div>
      </div>

      <div className="statusline">
        <span className="ok">&gt; expediente {record.id} cargado</span> · registro de la memoria de la
        empresa
      </div>

      <section className="section">
        <div style={{ marginBottom: 16 }}>
          <span className="stamp">Expediente · {record.id}</span>
        </div>
        <h1 className="manifesto" style={{ fontSize: "clamp(26px, 4.5vw, 40px)" }}>
          {record.name}
        </h1>
        <div className="tags" style={{ marginTop: 14 }}>
          <span className="tag">
            <b>año</b> {record.year}
          </span>
          <span className="tag">
            <b>cliente</b> {record.clientType}
          </span>
          {record.tech.map((t) => (
            <span className="tag" key={t}>
              <b>tech</b> {t}
            </span>
          ))}
          <span className="tag">
            <b>apuesta</b> {record.marketBet}
          </span>
          <span className="tag">
            <b>equipo</b> {record.teamDynamics}
          </span>
          <span className="tag amber">
            <b>categoría</b> {record.failureCategory}
          </span>
          <span className="tag amber">
            <b>severidad</b> {record.severity}/5
          </span>
        </div>
      </section>

      <section className="section">
        <div className="case-grid">
          <div className="case-row">
            <div className="k">// descripción</div>
            <div className="v prose">{record.description}</div>
          </div>
          <div className="case-row">
            <div className="k">// la apuesta / supuesto</div>
            <div className="v prose">{record.assumption}</div>
          </div>
          <div className="case-row">
            <div className="k">// qué salió mal</div>
            <div className="v prose">{record.whatWentWrong}</div>
          </div>
          <div className="case-row">
            <div className="k">// señales ignoradas</div>
            <div className="v">
              <ul className="prose" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {record.ignoredSignals.map((s, i) => (
                  <li key={i} style={{ paddingLeft: 18, position: "relative", margin: "3px 0" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--amber-dim)" }}>
                      //
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="case-row">
            <div className="k">// resultado</div>
            <div className="v prose">{record.outcome}</div>
          </div>
          <div className="case-row">
            <div className="k">// lección / mitigación</div>
            <div className="v prose">{record.mitigation}</div>
          </div>
        </div>
      </section>

      <div className="footer">
        Registro de la memoria de la empresa (datos sintéticos para el MVP). En producción provendría
        de <b>Microsoft Work IQ / Copilot Retrieval API</b> a través del mismo contrato de
        recuperación.
      </div>
    </div>
  );
}
