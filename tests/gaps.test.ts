import { test } from "node:test";
import assert from "node:assert/strict";
import { detectGaps } from "../lib/gaps";
import { heuristicProfile } from "../lib/profile";

test("descripción mínima dispara varias preguntas", () => {
  const gaps = detectGaps(heuristicProfile("Vamos a construir una plataforma web."));
  const missing = gaps.map((g) => g.missing);
  assert.ok(missing.includes("plazo / fecha objetivo"));
  assert.ok(missing.includes("métrica de éxito"));
});

test("la información presente NO genera pregunta", () => {
  const gaps = detectGaps(
    heuristicProfile(
      "Plataforma web con deadline en 3 meses, equipo de 5 personas con experiencia, mediremos conversión como métrica y ya validamos con un piloto de usuarios."
    )
  );
  const missing = gaps.map((g) => g.missing);
  assert.ok(!missing.includes("plazo / fecha objetivo"));
  assert.ok(!missing.includes("tamaño y experiencia del equipo"));
  assert.ok(!missing.includes("métrica de éxito"));
  assert.ok(!missing.includes("validación con usuarios reales"));
});

test("plan de datos solo se pregunta si el proyecto toca datos/IA", () => {
  const sinIA = detectGaps(heuristicProfile("Una tienda e-commerce para vender ropa."));
  assert.ok(!sinIA.some((g) => g.missing === "plan de datos"));
  const conIA = detectGaps(heuristicProfile("Un modelo de machine learning para scoring."));
  assert.ok(conIA.some((g) => g.missing === "plan de datos"));
});
