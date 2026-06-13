"use client";

// Error boundary de la app: convierte cualquier excepción de cliente en una
// pantalla con marca (en vez del "Application error" crudo de Next/Vercel),
// con un botón para reintentar y volver al inicio.

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // se ve en la consola del navegador para depurar
    console.error(error);
  }, [error]);

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
        </div>
      </div>
      <div className="statusline">
        <span style={{ color: "var(--red)" }}>&gt; error de ejecución capturado</span>
      </div>
      <section className="section">
        <div className="kicker">// fallo controlado</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(26px, 4.5vw, 44px)" }}>
          Algo se rompió.
          <br />
          <span className="dim">Pero no del todo.</span>
        </h1>
        <p className="lede prose">
          Ocurrió una excepción en esta vista. El resto de la app sigue viva — el agente, el
          razonamiento y la memoria no se vieron afectados.
          {error?.digest && (
            <>
              {" "}
              <span className="readout">ref: {error.digest}</span>
            </>
          )}
        </p>
        <div className="controls">
          <button className="primary" onClick={() => reset()}>
            [ reintentar ]
          </button>
          <Link href="/">
            <button>[ ir al inicio ]</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
