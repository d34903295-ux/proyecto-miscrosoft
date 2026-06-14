// ─────────────────────────────────────────────────────────────
// Etiquetas de display para el vocabulario controlado (categorías, tech,
// cliente, apuesta, equipo). Las listas son finitas, así que se traducen 1:1.
// El texto LIBRE de los casos (nombres, descripciones) es el archivo de la
// empresa en su idioma original y NO se traduce aquí.
// ─────────────────────────────────────────────────────────────

const EN: Record<string, string> = {
  // clientType
  enterprise: "enterprise",
  startup: "startup",
  gobierno: "government",
  consumer: "consumer",
  pyme: "SMB",
  interno: "internal",
  desconocido: "unknown",
  // tech
  "app móvil": "mobile app",
  web: "web",
  "IA/ML": "AI/ML",
  "chatbot/NLP": "chatbot/NLP",
  "datos/BI": "data/BI",
  "pagos/fintech": "payments/fintech",
  "cloud/migración": "cloud/migration",
  "legacy/integración": "legacy/integration",
  "API/plataforma": "API/platform",
  IoT: "IoT",
  blockchain: "blockchain",
  "e-commerce": "e-commerce",
  realtime: "realtime",
  // marketBet
  "first-mover": "first-mover",
  "nuevo mercado": "new market",
  "plataforma/escala": "platform/scale",
  "crecimiento agresivo": "aggressive growth",
  "cumplimiento/regulación": "compliance/regulation",
  "eficiencia/costos": "efficiency/cost",
  "expansión internacional": "international expansion",
  pivot: "pivot",
  // teamDynamics
  "deadline agresivo": "aggressive deadline",
  "equipo nuevo": "new team",
  "remoto/distribuido": "remote/distributed",
  outsourcing: "outsourcing",
  "multi-equipo": "multi-team",
  "founder-led": "founder-led",
  "alta rotación": "high turnover",
  "dependencia de persona clave": "key-person dependency",
  // failureCategory
  "Time-to-market": "Time-to-market",
  "Adopción/onboarding": "Adoption/onboarding",
  "UX/usabilidad": "UX/usability",
  "Integración legacy": "Legacy integration",
  "Calidad de datos": "Data quality",
  "Expectativas del cliente": "Client expectations",
  "Alcance/scope creep": "Scope creep",
  "Modelo de IA en producción": "AI model in production",
  "Pagos/conciliación": "Payments/reconciliation",
  "Coordinación multi-equipo": "Multi-team coordination",
  "Performance/escala": "Performance/scale",
  Sobreingeniería: "Over-engineering",
  Seguridad: "Security",
  "Dependencia de proveedor": "Vendor dependency",
  "Dependencia de persona clave": "Key-person dependency",
  "Cumplimiento/regulación": "Compliance/regulation",
  "Rotación/conocimiento": "Turnover/knowledge",
  // dimensiones de cobertura
  tech: "tech",
  apuesta: "bet",
  equipo: "team",
  cliente: "client",
};

/** Traduce un valor del vocabulario controlado al idioma de display. */
export function tlabel(value: string, lang: "es" | "en"): string {
  if (lang !== "en" || value == null) return value;
  return EN[value] ?? value;
}
