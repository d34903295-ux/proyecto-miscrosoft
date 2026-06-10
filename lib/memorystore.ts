// ─────────────────────────────────────────────────────────────
// Memoria institucional VIVA: los casos sembrados (company_memory.json) más
// los casos agregados en runtime vía API/UI, persistidos en el DocumentStore.
//
// Expone una versión monotónica: el SyntheticRetriever la usa para saber
// cuándo reconstruir sus vectores TF-IDF (solo cuando la memoria cambió).
// ─────────────────────────────────────────────────────────────

import type { PastProjectRecord } from "./types";
import { getStore, newId } from "./store";
import { log } from "./logger";
import seed from "./memory/company_memory.json";

const SEED = seed as PastProjectRecord[];
const COLLECTION = "memoria";

let cache: PastProjectRecord[] | null = null;
let version = 1;

function loadCustom(): PastProjectRecord[] {
  try {
    return getStore()
      .list<PastProjectRecord>(COLLECTION, 1000)
      .map((e) => e.doc);
  } catch (err: any) {
    log("warn", "no se pudieron leer casos custom; uso solo seed", { err: err?.message });
    return [];
  }
}

/** Todos los casos: sembrados + agregados en runtime (estos últimos primero). */
export function allRecords(): PastProjectRecord[] {
  if (!cache) cache = [...loadCustom(), ...SEED];
  return cache;
}

export function recordById(id: string): PastProjectRecord | undefined {
  return allRecords().find((r) => r.id === id);
}

/** Versión de la memoria: cambia cuando se agrega/borra un caso. */
export function memoryVersion(): number {
  return version;
}

/** Agrega un caso (ya validado) a la memoria persistente. Devuelve el registro completo. */
export function addRecord(input: Omit<PastProjectRecord, "id">): PastProjectRecord {
  const id = `PRJ-${input.year}-${newId().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-6)}`;
  const record: PastProjectRecord = { id, ...input };
  getStore().put(COLLECTION, id, record);
  cache = null;
  version += 1;
  log("info", "caso agregado a la memoria", { id, category: record.failureCategory });
  return record;
}

export function deleteRecord(id: string): boolean {
  // solo los casos custom viven en el store; los sembrados no se borran.
  const ok = getStore().delete(COLLECTION, id);
  if (ok) {
    cache = null;
    version += 1;
    log("info", "caso eliminado de la memoria", { id });
  }
  return ok;
}

/** Cuántos casos vienen del seed y cuántos fueron agregados en runtime. */
export function memoryStats(): { seed: number; custom: number; total: number } {
  const total = allRecords().length;
  return { seed: SEED.length, custom: total - SEED.length, total };
}
