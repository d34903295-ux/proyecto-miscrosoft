import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecordById } from "@/lib/retrieval";
import CaseChat from "@/components/CaseChat";
import { getServerLang, makeTr } from "@/lib/serverlang";

export const dynamic = "force-dynamic";

export default function CasePage({ params }: { params: { id: string } }) {
  const record = getRecordById(decodeURIComponent(params.id));
  if (!record) return notFound();
  const lang = getServerLang();
  const tr = makeTr(lang);

  return (
    <div className="shell">
      <div className="sysbar">
        <div className="brand">
          PRE-MORTEM<b>/</b>INSTITUCIONAL
        </div>
        <div className="sys-right">
          <Link href="/" className="back">
            &lt;&lt; {tr("volver", "back")}
          </Link>
        </div>
      </div>

      <div className="statusline">
        <span className="ok">&gt; {tr("expediente", "case file")} {record.id} {tr("cargado", "loaded")}</span> ·{" "}
        {tr("registro de la memoria de la empresa", "a record from the company's memory")}
      </div>

      <section className="section">
        <div style={{ marginBottom: 16 }}>
          <span className="stamp">{tr("Expediente interno ·", "Internal case file ·")} {record.id}</span>
        </div>
        <h1 className="manifesto" style={{ fontSize: "clamp(26px, 4.5vw, 40px)" }}>
          {record.name}
        </h1>
        <p className="lede prose" style={{ marginTop: 12, maxWidth: "70ch" }}>
          {lang === "en" ? (
            <>
              <b>Anonymized internal case</b> from the company's memory — «{record.name.split("—")[0].trim()}» is
              a <b>codename</b>, not a public company. (Real, sourced public failures live in{" "}
              <a className="cmd" href="/mundo">// 3d world</a>.)
            </>
          ) : (
            <>
              <b>Caso interno anonimizado</b> de la memoria de la empresa — «{record.name.split("—")[0].trim()}» es
              un <b>nombre en clave</b>, no una empresa pública. (Los fracasos públicos reales y con fuente
              verificable están en <a className="cmd" href="/mundo">// mundo 3d</a>.)
            </>
          )}
        </p>
        <div className="tags" style={{ marginTop: 14 }}>
          <span className="tag">
            <b>{tr("año", "year")}</b> {record.year}
          </span>
          <span className="tag">
            <b>{tr("cliente", "client")}</b> {record.clientType}
          </span>
          {record.tech.map((t) => (
            <span className="tag" key={t}>
              <b>tech</b> {t}
            </span>
          ))}
          <span className="tag">
            <b>{tr("apuesta", "bet")}</b> {record.marketBet}
          </span>
          <span className="tag">
            <b>{tr("equipo", "team")}</b> {record.teamDynamics}
          </span>
          <span className="tag amber">
            <b>{tr("categoría", "category")}</b> {record.failureCategory}
          </span>
          <span className="tag amber">
            <b>{tr("severidad", "severity")}</b> {record.severity}/5
          </span>
        </div>
      </section>

      <section className="section">
        <div className="case-grid">
          <div className="case-row">
            <div className="k">{tr("// descripción", "// description")}</div>
            <div className="v prose">{record.description}</div>
          </div>
          <div className="case-row">
            <div className="k">{tr("// la apuesta / supuesto", "// the bet / assumption")}</div>
            <div className="v prose">{record.assumption}</div>
          </div>
          <div className="case-row">
            <div className="k">{tr("// qué salió mal", "// what went wrong")}</div>
            <div className="v prose">{record.whatWentWrong}</div>
          </div>
          <div className="case-row">
            <div className="k">{tr("// señales ignoradas", "// ignored signals")}</div>
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
            <div className="k">{tr("// resultado", "// outcome")}</div>
            <div className="v prose">{record.outcome}</div>
          </div>
          <div className="case-row">
            <div className="k">{tr("// lección / mitigación", "// lesson / mitigation")}</div>
            <div className="v prose">{record.mitigation}</div>
          </div>
        </div>
      </section>

      <CaseChat caseId={record.id} lang={lang} />

      <div className="footer">
        {tr(
          "Registro de la memoria de la empresa. La recuperación corre sobre el mismo contrato de Microsoft Foundry IQ y el Q&A razona con un modelo de Microsoft Foundry.",
          "A record from the company's memory. Retrieval runs on the same Microsoft Foundry IQ contract, and the Q&A reasons with a Microsoft Foundry model."
        )}
      </div>
    </div>
  );
}
