"use client";

// Boundary de último recurso: captura errores que ocurren en el propio layout
// raíz. Debe renderizar su propio <html>/<body>.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0b0b0d",
          color: "#e9e6df",
          fontFamily: "ui-monospace, monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ color: "#f2b01e", letterSpacing: "0.2em", fontSize: 12 }}>
            // PRE-MORTEM / INSTITUCIONAL
          </div>
          <h1 style={{ fontSize: 30, textTransform: "uppercase", lineHeight: 1 }}>
            Error de aplicación
          </h1>
          <p style={{ color: "#b7b3aa" }}>
            Se capturó una excepción en el nivel raíz. Recarga para continuar.
            {error?.digest ? ` (ref: ${error.digest})` : ""}
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "transparent",
              border: "1px solid #f2b01e",
              color: "#f2b01e",
              padding: "10px 16px",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            [ reintentar ]
          </button>
        </div>
      </body>
    </html>
  );
}
