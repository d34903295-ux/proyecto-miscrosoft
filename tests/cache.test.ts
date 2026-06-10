import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheGet, cacheKey, cachePut } from "../lib/cache";
import { addRecord, deleteRecord } from "../lib/memorystore";
import type { PreMortemReport } from "../lib/types";

const fakeReport = { verdict: { riskIndex: 50 } } as unknown as PreMortemReport;

test("misma descripción y profundidad → misma clave; profundidad distinta → otra", () => {
  assert.equal(cacheKey("proyecto x", "estandar"), cacheKey("proyecto x", "estandar"));
  assert.notEqual(cacheKey("proyecto x", "estandar"), cacheKey("proyecto x", "profundo"));
  assert.notEqual(cacheKey("proyecto x", "estandar"), cacheKey("proyecto y", "estandar"));
});

test("put/get devuelve el reporte cacheado", () => {
  const key = cacheKey("descripción de prueba para cache", "rapido");
  assert.equal(cacheGet(key), null);
  cachePut(key, fakeReport);
  assert.equal(cacheGet(key), fakeReport);
});

test("agregar un caso a la memoria viva invalida las claves (memoryVersion)", () => {
  process.env.DATA_DIR = `/tmp/premortem-cache-test-${Date.now()}`;
  const before = cacheKey("misma descripción", "estandar");
  const added = addRecord({
    name: "Caso temporal para test de invalidación",
    year: 2025,
    clientType: "interno",
    tech: ["web"],
    marketBet: "eficiencia/costos",
    teamDynamics: "equipo nuevo",
    description: "Caso sintético solo para verificar la invalidación del caché.",
    assumption: "Ninguna.",
    whatWentWrong: "Nada: es un caso de prueba para el versionado de memoria.",
    ignoredSignals: ["señal de prueba"],
    outcome: "N/A (test).",
    severity: 1,
    failureCategory: "Sobreingeniería",
    mitigation: "N/A (test).",
  });
  const after = cacheKey("misma descripción", "estandar");
  deleteRecord(added.id);
  assert.notEqual(before, after, "la clave debe cambiar al cambiar la memoria");
});
