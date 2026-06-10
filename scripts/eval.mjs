// ─────────────────────────────────────────────────────────────
// Evaluación del razonamiento del agente contra un GOLDEN SET.
//
// Un agente de razonamiento no se juzga por lo bonito del reporte sino por si
// recuerda el caso CORRECTO. Este harness ejecuta descripciones de proyecto
// con resultado esperado conocido y mide:
//
//   1. recuerdo    — ¿la categoría de fallo esperada aparece en el top-3?
//   2. evidencia   — ¿cada riesgo está anclado a un caso real, abrible,
//                    presente en la lista de inspeccionados? (regla: no inventar)
//   3. calibración — ¿la confianza y el veredicto de refutación son coherentes?
//   4. determinismo— con el motor stub, ¿la misma entrada da el mismo resultado?
//
// Uso:  npm run dev   (en otra terminal)
//       npm run eval
// ─────────────────────────────────────────────────────────────

const BASE = process.env.EVAL_URL ?? "http://localhost:3000";

const GOLDEN = [
  {
    name: "wallet fintech contrarreloj",
    expect: ["Seguridad", "Pagos/conciliación"],
    description:
      "Somos una fintech y vamos a lanzar una wallet móvil con tarjeta virtual. Hay dos competidores a punto de salir, así que la prioridad es lanzar features rápido y crecer en usuarios de forma agresiva. El endurecimiento de seguridad lo haremos después del lanzamiento.",
  },
  {
    name: "replatform e-commerce con fecha fija",
    expect: ["Time-to-market", "Performance/escala"],
    description:
      "Vamos a reemplazar la tienda online completa de un retailer grande. La fecha de corte está atada a Black Friday porque la campaña de medios ya está comprada y no se puede mover. Si el calendario aprieta, recortaremos pruebas.",
  },
  {
    name: "plataforma de APIs multi-equipo",
    expect: ["Coordinación multi-equipo", "Integración legacy"],
    description:
      "Vamos a construir una capa de APIs internas en un banco para que cinco equipos de producto dejen de integrarse punto a punto contra el core legacy. La coordinación entre los varios equipos se hará con un comité de arquitectura.",
  },
  {
    name: "sistema público con rotación",
    expect: ["Rotación/conocimiento", "Integración legacy"],
    description:
      "Digitalización de trámites de un organismo de gobierno con plazo regulatorio. El equipo es mixto: gente de planta y consultores externos de una consultora, donde es normal que haya rotación y cambios de personal durante el proyecto.",
  },
  {
    name: "telemetría IoT mono-proveedor",
    expect: ["Dependencia de proveedor", "Calidad de datos"],
    description:
      "Plataforma de telemetría en tiempo real para flotas de camiones, con sensores y dispositivos IoT de un único fabricante elegido por precio. El equipo es nuevo en hardware y la apuesta es entrar a un mercado nuevo.",
  },
  {
    name: "copiloto interno sobre documentos",
    expect: ["Seguridad", "Modelo de IA en producción"],
    description:
      "Queremos un asistente conversacional interno con IA generativa que responda preguntas de los empleados sobre la base documental de la empresa: políticas, contratos y planillas. Conectaremos el índice de búsqueda que ya tenemos para ahorrar tiempo.",
  },
  {
    name: "streaming en vivo consumer",
    expect: ["Performance/escala", "Time-to-market"],
    description:
      "App para el público general a la que vamos a agregar streaming en vivo con chat en tiempo real para conciertos, esperando decenas de miles de espectadores concurrentes. Si las pruebas con cientos de usuarios funcionan, escalar debería ser subir instancias.",
  },
  {
    name: "delivery con fecha de campaña",
    expect: ["Adopción/onboarding", "Time-to-market"],
    description:
      "Vamos a lanzar una app móvil de delivery propia para una cadena de restaurantes grande, para dejar de pagar comisiones a los marketplaces. La fecha de lanzamiento está atada a una campaña de marketing nacional, así que es fija. El equipo es nuevo en este dominio y la apuesta es crecer rápido en adopción ofreciendo descuentos.",
  },
];

async function premortem(description) {
  const res = await fetch(`${BASE}/api/premortem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // save:false → la evaluación no contamina el historial de informes
    body: JSON.stringify({ description, save: false }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function checkEvidence(report) {
  const problems = [];
  const inspectedIds = new Set(report.inspected.map((c) => c.caseId));
  for (const r of report.risks) {
    const e = r.evidence;
    if (!inspectedIds.has(e.caseId))
      problems.push(`riesgo #${r.rank}: caso ${e.caseId} no está en inspeccionados`);
    if (!e.extract || !e.extract.trim())
      problems.push(`riesgo #${r.rank}: cita de evidencia vacía`);
    if (!e.webUrl || !e.webUrl.includes(e.caseId))
      problems.push(`riesgo #${r.rank}: webUrl no apunta al caso (${e.webUrl})`);
  }
  return problems;
}

function checkCalibration(report) {
  const problems = [];
  for (const r of report.risks) {
    if (!(r.confidence >= 0 && r.confidence <= 1))
      problems.push(`riesgo #${r.rank}: confianza fuera de rango (${r.confidence})`);
    if (!["fuerte", "parcial", "débil"].includes(r.refutation.stands))
      problems.push(`riesgo #${r.rank}: stands inválido (${r.refutation.stands})`);
    // coherencia documentada del stub: stands se deriva de la confianza calibrada
    if (report.generatedWith === "stub") {
      const expected = r.confidence >= 0.6 ? "fuerte" : r.confidence >= 0.4 ? "parcial" : "débil";
      if (r.refutation.stands !== expected)
        problems.push(
          `riesgo #${r.rank}: stands «${r.refutation.stands}» contradice confianza ${r.confidence} (esperaba «${expected}»)`
        );
    }
  }
  return problems;
}

async function main() {
  // ¿servidor arriba?
  try {
    await fetch(BASE, { method: "HEAD" });
  } catch {
    console.error(`✗ No hay servidor en ${BASE}. Corre \`npm run dev\` primero (o define EVAL_URL).`);
    process.exit(1);
  }

  console.log(`Evaluando contra ${BASE} · ${GOLDEN.length} casos dorados\n`);
  let recallHits = 0;
  const evidenceProblems = [];
  const calibrationProblems = [];
  let engine = "?";

  for (const g of GOLDEN) {
    const report = await premortem(g.description);
    engine = `${report.generatedWith}/${report.retrieverUsed}`;
    const top3 = report.risks.slice(0, 3).map((r) => r.failureCategory);
    const hit = g.expect.some((cat) => top3.includes(cat));
    if (hit) recallHits++;
    evidenceProblems.push(...checkEvidence(report).map((p) => `[${g.name}] ${p}`));
    calibrationProblems.push(...checkCalibration(report).map((p) => `[${g.name}] ${p}`));
    console.log(
      `${hit ? "✓" : "✗"} ${g.name}\n    esperaba: ${g.expect.join(" | ")}\n    top-3:    ${top3.join(" · ")}`
    );
  }

  // determinismo (solo tiene sentido con el stub)
  let deterministic = null;
  if (engine.startsWith("stub")) {
    const [a, b] = [await premortem(GOLDEN[0].description), await premortem(GOLDEN[0].description)];
    deterministic =
      JSON.stringify(a.risks.map((r) => [r.id, r.rank, r.confidence])) ===
      JSON.stringify(b.risks.map((r) => [r.id, r.rank, r.confidence]));
  }

  const pct = Math.round((recallHits / GOLDEN.length) * 100);
  console.log(`\n──────────────────────────────────────────────`);
  console.log(`motor: ${engine}`);
  console.log(`recuerdo (categoría esperada en top-3): ${recallHits}/${GOLDEN.length} (${pct}%)`);
  console.log(`integridad de evidencia: ${evidenceProblems.length === 0 ? "✓ sin problemas" : `✗ ${evidenceProblems.length} problemas`}`);
  for (const p of evidenceProblems) console.log(`   - ${p}`);
  console.log(`calibración: ${calibrationProblems.length === 0 ? "✓ coherente" : `✗ ${calibrationProblems.length} problemas`}`);
  for (const p of calibrationProblems) console.log(`   - ${p}`);
  if (deterministic !== null)
    console.log(`determinismo (stub): ${deterministic ? "✓ misma entrada → mismo reporte" : "✗ NO determinista"}`);

  const failed =
    recallHits < GOLDEN.length || evidenceProblems.length > 0 || calibrationProblems.length > 0 || deterministic === false;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("✗ Error en la evaluación:", e.message);
  process.exit(1);
});
