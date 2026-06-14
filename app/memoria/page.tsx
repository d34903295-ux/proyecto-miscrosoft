import Link from "next/link";
import { getAllRecords } from "@/lib/retrieval";
import MemoryBrowser from "./MemoryBrowser";
import MemoryLoader from "./MemoryLoader";

export const dynamic = "force-dynamic";

export default function MemoriaPage() {
  const records = getAllRecords();
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
        <span className="ok">&gt; archivo de memoria institucional</span> · {records.length}{" "}
        expedientes indexados
      </div>

      <section className="section">
        <div className="kicker">// archivo · memoria de la empresa</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(28px, 5vw, 52px)" }}>
          Expedientes
        </h1>
        <p className="lede prose">
          La memoria de la empresa: cada expediente es un caso pasado que el agente recupera y cita
          como evidencia en un pre-mortem. Esta demo trae <b>{records.length} casos de ejemplo
          anonimizados</b> (nombres en clave) — abajo puedes <b>cargar la historia de tu propia
          empresa</b>.
        </p>
      </section>

      <MemoryLoader />

      <MemoryBrowser records={records} />

      <div className="footer">
        Memoria institucional viva: se carga por CSV / API o, en producción, conectando los documentos
        internos de la empresa vía <b>Microsoft Foundry IQ</b> — mismo contrato de recuperación.
      </div>
    </div>
  );
}
