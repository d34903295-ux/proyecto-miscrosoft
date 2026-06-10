// ─────────────────────────────────────────────────────────────
// Punto de No Retorno: condiciones accionables con plazo.
//
// "Si llegas a {mes} sin resolver esto, la probabilidad de fracaso supera X%."
// El mes viene de la fase típica en que cada modo de fallo golpea (la misma
// tabla de la simulación) y la probabilidad sale de la curva de supervivencia
// — no es un número inventado, es el modelo aplicado a TUS riesgos.
// ─────────────────────────────────────────────────────────────

import type { DerivedRisk, PointOfNoReturn, Simulation } from "./types";

/** Condición de control por categoría de fallo (qué tiene que estar resuelto). */
const CONDITIONS: Record<string, string> = {
  "Time-to-market": "Tener recorte de alcance pactado por escrito (qué sale si el calendario aprieta)",
  "Adopción/onboarding": "Alcanzar uso real y medible de usuarios (no descargas: uso recurrente)",
  "UX/usabilidad": "Validar el flujo completo con usuarios reales sin asistencia",
  "Integración legacy": "Tener TODAS las integraciones críticas funcionando end-to-end en staging",
  "Calidad de datos": "Auditar la calidad de los datos reales (no los del piloto)",
  "Expectativas del cliente": "Reconfirmar con el cliente qué considera éxito, por escrito",
  "Alcance/scope creep": "Congelar el alcance del primer release y la regla para decir que no",
  "Modelo de IA en producción": "Medir el modelo con tráfico/datos reales en condiciones de producción",
  "Pagos/conciliación": "Cuadrar la conciliación de dinero de punta a punta con montos reales",
  "Coordinación multi-equipo": "Contract tests en CI de todos los equipos consumidores",
  "Performance/escala": "Prueba de carga del camino real del usuario al doble del pico esperado",
  Sobreingeniería: "Tener la versión simple funcionando ANTES de la pieza exótica",
  Seguridad: "Pentest externo cerrado y permisos verificados con cuentas de mínimo privilegio",
  "Dependencia de proveedor": "Segundo proveedor homologado o capa de abstracción probada",
  "Dependencia de persona clave": "Conocimiento crítico documentado y al menos una persona de respaldo",
  "Cumplimiento/regulación": "Validación del esquema regulatorio/fiscal con un experto local",
  "Rotación/conocimiento": "Decisiones de negocio con minuta y onboarding de reemplazos medido",
};

export function pointOfNoReturn(
  risks: DerivedRisk[],
  sim: Simulation
): PointOfNoReturn | null {
  if (!risks.length || !sim.deadliest) return null;

  // los 3 riesgos más letales definen las condiciones
  const top = [...risks]
    .sort((a, b) => b.evidence.severity * b.confidence - a.evidence.severity * a.confidence)
    .slice(0, 3);

  const q = sim.deadliest.q;
  const at = sim.points[Math.min(q + 2, sim.points.length - 1)]; // poco después del golpe
  const failureProbability = Number((1 - at.survival).toFixed(2));

  return {
    whenLabel: sim.deadliest.whenLabel,
    failureProbability,
    conditions: top.map((r) => ({
      condition:
        CONDITIONS[r.failureCategory] ??
        `Resolver la mitigación del riesgo #${r.rank} (${r.failureCategory.toLowerCase()})`,
      deadline: `antes de ${sim.events.find((e) => e.caseId === r.evidence.caseId)?.whenLabel ?? sim.deadliest!.whenLabel}`,
      failureCategory: r.failureCategory,
      caseId: r.evidence.caseId,
    })),
  };
}
