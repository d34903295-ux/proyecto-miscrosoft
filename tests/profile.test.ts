import { test } from "node:test";
import assert from "node:assert/strict";
import { heuristicProfile } from "../lib/profile";

test("detecta dimensiones de una descripción fintech con deadline", () => {
  const p = heuristicProfile(
    "Somos una fintech y lanzamos una app móvil de pagos antes de Black Friday, la fecha es fija."
  );
  assert.ok(p.tech.includes("pagos/fintech"));
  assert.ok(p.tech.includes("app móvil"));
  assert.ok(p.teamDynamics.includes("deadline agresivo"));
});

test("descripción vacía produce perfil con defaults seguros", () => {
  const p = heuristicProfile("");
  assert.equal(p.summary, "(sin descripción)");
  assert.ok(p.tech.length > 0);
  assert.ok(p.marketBet.length > 0);
});

test("detecta cliente gobierno", () => {
  const p = heuristicProfile("Sistema de trámites para un ministerio del sector público");
  assert.equal(p.clientType, "gobierno");
});
