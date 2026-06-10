import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVectorizer, cosine, tokenize, vectorizeQuery } from "../lib/textsim";

test("tokenize normaliza acentos, minúsculas y stopwords", () => {
  const tokens = tokenize("La Integración con el sistema LEGACY falló");
  assert.ok(tokens.includes("integracion"));
  assert.ok(tokens.includes("legacy"));
  assert.ok(!tokens.includes("la"), "stopword 'la' debe filtrarse");
  assert.ok(!tokens.includes("el"), "stopword 'el' debe filtrarse");
});

test("cosine: idéntico=1, sin solapamiento=0, rango [0,1]", () => {
  const docs = ["pagos con tarjeta fintech", "sensores iot telemetría flota"];
  const v = buildVectorizer(docs);
  assert.ok(Math.abs(cosine(v.vectors[0], v.vectors[0]) - 1) < 1e-9);
  assert.equal(cosine(v.vectors[0], v.vectors[1]), 0);
});

test("vectorizeQuery recupera el documento más parecido", () => {
  const docs = [
    "wallet de pagos fintech con tarjeta virtual",
    "migración del datacenter a la nube",
    "chatbot de soporte con inteligencia artificial",
  ];
  const v = buildVectorizer(docs);
  const q = vectorizeQuery("vamos a lanzar una wallet de pagos", v.idf);
  const scores = v.vectors.map((vec) => cosine(q, vec));
  assert.equal(scores.indexOf(Math.max(...scores)), 0);
});
