import Link from "next/link";
import { getAllRecords } from "@/lib/retrieval";
import MemoryBrowser from "./MemoryBrowser";

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
          <span>rev 1.1</span>
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
          Todos los proyectos pasados de la memoria. Cada uno es un caso real que el agente puede
          recuperar y citar como evidencia en un pre-mortem.
        </p>
      </section>

      <MemoryBrowser records={records} />

      <div className="footer">
        Datos sintéticos para el MVP. En producción provendrían de <b>Microsoft Work IQ / Copilot
        Retrieval API</b> a través del mismo contrato de recuperación.
      </div>
    </div>
  );
}
