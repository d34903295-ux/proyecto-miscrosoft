import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePreMortem } from "../lib/agent";

const DESC =
  "Vamos a lanzar una wallet móvil fintech contrarreloj con un equipo nuevo; la seguridad la endurecemos después del lanzamiento.";

test("el agente produce un reporte completo y coherente (stub)", async () => {
  const report = await generatePreMortem(DESC);

  // riesgos rankeados 1..N sin huecos
  assert.ok(report.risks.length > 0);
  report.risks.forEach((r, i) => assert.equal(r.rank, i + 1));

  // regla "no inventa": toda evidencia apunta a un caso inspeccionado
  const inspected = new Set(report.inspected.map((c) => c.caseId));
  for (const r of report.risks) {
    assert.ok(inspected.has(r.evidence.caseId), `evidencia ${r.evidence.caseId} no inspeccionada`);
    assert.ok(r.evidence.extract.length > 0);
  }

  // sin categorías repetidas (dedupe)
  const cats = report.risks.map((r) => r.failureCategory);
  assert.equal(new Set(cats).size, cats.length);

  // calibración stub: stands se deriva de la confianza
  for (const r of report.risks) {
    const expected = r.confidence >= 0.6 ? "fuerte" : r.confidence >= 0.4 ? "parcial" : "débil";
    assert.equal(r.refutation.stands, expected);
  }

  // traza completa de los 7 pasos
  assert.equal(report.trace.length, 6);
  assert.deepEqual(
    report.trace.map((t) => t.name),
    ["perfilar", "recuperar", "deduplicar", "mapear+refutar", "rankear", "autoevaluar"]
  );
});

test("determinismo: misma entrada → mismo resultado (stub)", async () => {
  const [a, b] = [await generatePreMortem(DESC), await generatePreMortem(DESC)];
  assert.deepEqual(
    a.risks.map((r) => [r.id, r.rank, r.confidence]),
    b.risks.map((r) => [r.id, r.rank, r.confidence])
  );
});
