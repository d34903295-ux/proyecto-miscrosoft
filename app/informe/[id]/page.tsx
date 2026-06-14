// Permalink de un informe persistido: el mismo componente Report que la
// página principal, hidratado desde el historial.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { PreMortemReport } from "@/lib/types";
import { getStore } from "@/lib/store";
import Report from "@/components/Report";
import { getServerLang, makeTr } from "@/lib/serverlang";

export const dynamic = "force-dynamic";

function fmtDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleString(lang === "en" ? "en-US" : "es", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function InformePage({ params }: { params: { id: string } }) {
  const lang = getServerLang();
  const tr = makeTr(lang);
  let report: PreMortemReport | null = null;
  try {
    report = getStore().get<PreMortemReport>("informes", params.id);
  } catch {
    // id con formato inválido → 404
  }
  if (!report) return notFound();
  report.id = params.id;

  return (
    <div className="shell">
      <div className="sysbar">
        <div className="brand">
          PRE-MORTEM<b>/</b>INSTITUCIONAL
        </div>
        <div className="sys-right">
          <Link href="/informes" className="syslink">
            {tr("// informes", "// reports")}
          </Link>
          <Link href="/" className="syslink">
            &lt;&lt; {tr("volver", "back")}
          </Link>
        </div>
      </div>

      <div className="statusline">
        <span className="ok">&gt; {tr("informe", "report")} {params.id}</span> · {tr("generado", "generated")}{" "}
        {fmtDate(report.generatedAt, lang)} · {tr("motor", "engine")} {report.generatedWith} ·{" "}
        {tr("memoria", "memory")} {report.retrieverUsed}
      </div>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="kicker">{tr("// informe persistido · proyecto analizado", "// saved report · analyzed project")}</div>
        <p className="lede prose" style={{ marginTop: 10 }}>
          {report.profile.raw}
        </p>
      </section>

      <Report report={report} />

      <div className="footer">
        {tr("Informe persistido del historial.", "Saved report from the history.")} <b>MICROSOFT AGENTS LEAGUE</b> · TRACK REASONING AGENTS.
      </div>
    </div>
  );
}
