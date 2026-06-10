// Permalink de un informe persistido: el mismo componente Report que la
// página principal, hidratado desde el historial.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { PreMortemReport } from "@/lib/types";
import { getStore } from "@/lib/store";
import Report from "@/components/Report";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function InformePage({ params }: { params: { id: string } }) {
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
            // informes
          </Link>
          <Link href="/" className="syslink">
            &lt;&lt; volver
          </Link>
        </div>
      </div>

      <div className="statusline">
        <span className="ok">&gt; informe {params.id}</span> · generado {fmtDate(report.generatedAt)} ·
        motor {report.generatedWith} · memoria {report.retrieverUsed}
      </div>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="kicker">// informe persistido · proyecto analizado</div>
        <p className="lede prose" style={{ marginTop: 10 }}>
          {report.profile.raw}
        </p>
      </section>

      <Report report={report} />

      <div className="footer">
        Informe persistido del historial. <b>MICROSOFT AGENTS LEAGUE</b> · TRACK REASONING AGENTS.
      </div>
    </div>
  );
}
