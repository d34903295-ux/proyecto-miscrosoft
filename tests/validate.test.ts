import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCaseInput } from "../lib/validate";

const validCase = {
  name: "Test — Proyecto de prueba para validación",
  year: 2024,
  clientType: "startup",
  tech: ["web", "pagos/fintech"],
  marketBet: "crecimiento agresivo",
  teamDynamics: "equipo nuevo",
  description: "Descripción suficientemente larga del proyecto de prueba.",
  assumption: "Asumimos algo optimista.",
  whatWentWrong: "Salió mal de una manera específica y medible que describimos aquí.",
  ignoredSignals: ["Una señal clara que se ignoró"],
  outcome: "Resultado negativo cuantificado.",
  severity: 3,
  failureCategory: "Seguridad",
  mitigation: "Lo que se debió hacer distinto.",
};

test("caso válido pasa", () => {
  const r = validateCaseInput(validCase);
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.equal(r.value?.severity, 3);
});

test("etiqueta de tech inválida es rechazada con error legible", () => {
  const r = validateCaseInput({ ...validCase, tech: ["web", "inventada"] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("inventada")));
});

test("severity fuera de rango es rechazada", () => {
  assert.equal(validateCaseInput({ ...validCase, severity: 9 }).ok, false);
  assert.equal(validateCaseInput({ ...validCase, severity: 0 }).ok, false);
});

test("cuerpo nulo no explota", () => {
  const r = validateCaseInput(null);
  assert.equal(r.ok, false);
  assert.ok(r.errors.length > 0);
});
