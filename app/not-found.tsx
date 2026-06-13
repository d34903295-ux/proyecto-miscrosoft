import Link from "next/link";

export default function NotFound() {
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
        <span style={{ color: "var(--amber)" }}>&gt; 404 · expediente no encontrado</span>
      </div>
      <section className="section">
        <div className="kicker">// no consta en el archivo</div>
        <h1 className="manifesto" style={{ fontSize: "clamp(26px, 4.5vw, 44px)" }}>
          Esta página no existe
          <br />
          <span className="dim">o el informe expiró.</span>
        </h1>
        <p className="lede prose">
          Los informes guardados viven en almacenamiento efímero del servidor (serverless): un
          permalink puede dejar de estar disponible tras un tiempo. Genera un nuevo pre-mortem —
          el reporte completo aparece al instante en pantalla.
        </p>
        <div className="controls">
          <Link href="/">
            <button className="primary">[ generar un pre-mortem ]</button>
          </Link>
          <Link href="/memoria">
            <button>[ explorar la memoria ]</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
