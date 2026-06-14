import Link from "next/link";
import { getAllRecords } from "@/lib/retrieval";
import MemoryBrowser from "./MemoryBrowser";
import MemoryLoader from "./MemoryLoader";
import { getServerLang, makeTr } from "@/lib/serverlang";

export const dynamic = "force-dynamic";

export default function MemoriaPage() {
  const lang = getServerLang();
  const tr = makeTr(lang);
  const records = getAllRecords();
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
        <span className="ok">&gt; {tr("archivo de memoria institucional", "institutional memory archive")}</span> ·{" "}
        {records.length} {tr("expedientes indexados", "indexed case files")}
      </div>

      <section className="section">
        <div className="kicker">{tr("// archivo · memoria de la empresa", "// archive · company memory")}</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(28px, 5vw, 52px)" }}>
          {tr("Expedientes", "Case files")}
        </h1>
        <p className="lede prose">
          {lang === "en" ? (
            <>
              The company's memory: each case file is a past project the agent retrieves and cites as
              evidence in a pre-mortem. This demo ships with <b>{records.length} anonymized sample cases</b>{" "}
              (codenames) — below you can <b>load your own company's history</b>. Labels are localized;
              the free-text records are shown in the archive's original language (Spanish in this demo).
            </>
          ) : (
            <>
              La memoria de la empresa: cada expediente es un caso pasado que el agente recupera y cita como
              evidencia en un pre-mortem. Esta demo trae <b>{records.length} casos de ejemplo anonimizados</b>{" "}
              (nombres en clave) — abajo puedes <b>cargar la historia de tu propia empresa</b>.
            </>
          )}
        </p>
      </section>

      <MemoryLoader lang={lang} />

      <MemoryBrowser records={records} lang={lang} />

      <div className="footer">
        {tr(
          "Memoria institucional viva: se carga por CSV / API o, en producción, conectando los documentos internos de la empresa vía Microsoft Foundry IQ — mismo contrato de recuperación.",
          "Live institutional memory: loaded via CSV / API or, in production, by connecting the company's internal documents through Microsoft Foundry IQ — same retrieval contract."
        )}
      </div>
    </div>
  );
}
