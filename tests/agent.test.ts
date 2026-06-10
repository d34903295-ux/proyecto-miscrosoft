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

  // traza completa de los 8 pasos
  assert.equal(report.trace.length, 7);
  assert.deepEqual(
    report.trace.map((t) => t.name),
    ["perfilar", "recuperar", "deduplicar", "mapear+refutar", "rankear", "autoevaluar", "deliberar"]
  );

  // consejo: 4 votos, cada uno con argumento anclado
  assert.equal(report.board.votes.length, 4);
  assert.ok(["sí", "condicionado", "no"].includes(report.board.invest));
  for (const v of report.board.votes) assert.ok(v.argument.length > 20);

  // coste esperado: total = suma de pérdidas esperadas, todas ≥ 0
  const sum = report.costs.perRisk.reduce((a, c) => a + c.expected, 0);
  assert.equal(report.costs.totalExpected, sum);
  assert.ok(report.costs.perRisk.every((c) => c.expected >= 0 && c.probability <= 1));

  // punto de no retorno: probabilidad válida y condiciones ancladas a casos
  assert.ok(report.pointOfNoReturn, "debe existir con riesgos presentes");
  assert.ok(report.pointOfNoReturn!.failureProbability > 0 && report.pointOfNoReturn!.failureProbability <= 1);
  assert.ok(report.pointOfNoReturn!.conditions.length >= 1);

  // funeral: narrativo y anclado (menciona algún caso real del reporte)
  assert.ok(report.funeral.length > 100);
  const someCase = report.risks.some((r) =>
    report.funeral.includes(r.evidence.caseName.split("—")[0].trim())
  );
  assert.ok(someCase, "el funeral debe citar un caso real");
});

test("determinismo: misma entrada → mismo resultado (stub)", async () => {
  const [a, b] = [await generatePreMortem(DESC), await generatePreMortem(DESC)];
  assert.deepEqual(
    a.risks.map((r) => [r.id, r.rank, r.confidence]),
    b.risks.map((r) => [r.id, r.rank, r.confidence])
  );
});
