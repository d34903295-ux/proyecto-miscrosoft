// ─────────────────────────────────────────────────────────────
// Persistencia con adaptador intercambiable.
//
// FileStore guarda documentos JSON en disco (un archivo por documento, escritura
// atómica vía rename) — cero dependencias y suficiente para un despliegue de un
// nodo. La interfaz DocumentStore es el contrato: para multi-instancia se cambia
// por un adaptador de Azure Cosmos DB / Table Storage sin tocar el resto.
// ─────────────────────────────────────────────────────────────

import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface DocumentStore {
  put(collection: string, id: string, doc: unknown): void;
  get<T>(collection: string, id: string): T | null;
  /** Lista los documentos de una colección, más recientes primero. */
  list<T>(collection: string, limit?: number): { id: string; doc: T }[];
  delete(collection: string, id: string): boolean;
}

/** Solo ids seguros para nombre de archivo (defensa contra path traversal). */
const SAFE_ID = /^[a-zA-Z0-9_-]{1,80}$/;

function assertSafeId(id: string): void {
  if (!SAFE_ID.test(id)) throw new Error(`id inválido: ${JSON.stringify(id)}`);
}

export class FileStore implements DocumentStore {
  constructor(private baseDir: string) {}

  private dir(collection: string): string {
    assertSafeId(collection);
    const d = join(this.baseDir, collection);
    mkdirSync(d, { recursive: true });
    return d;
  }

  put(collection: string, id: string, doc: unknown): void {
    assertSafeId(id);
    const dir = this.dir(collection);
    const tmp = join(dir, `.${id}.tmp`);
    writeFileSync(tmp, JSON.stringify(doc), "utf8");
    renameSync(tmp, join(dir, `${id}.json`)); // atómico en el mismo filesystem
  }

  get<T>(collection: string, id: string): T | null {
    assertSafeId(id);
    try {
      return JSON.parse(readFileSync(join(this.dir(collection), `${id}.json`), "utf8")) as T;
    } catch {
      return null;
    }
  }

  list<T>(collection: string, limit = 100): { id: string; doc: T }[] {
    const dir = this.dir(collection);
    const files = readdirSync(dir, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith(".json"))
      .map((f) => f.name)
      .sort()
      .reverse() // los ids llevan timestamp como prefijo → orden cronológico inverso
      .slice(0, limit);
    const out: { id: string; doc: T }[] = [];
    for (const name of files) {
      const id = name.slice(0, -5);
      const doc = this.get<T>(collection, id);
      if (doc !== null) out.push({ id, doc });
    }
    return out;
  }

  delete(collection: string, id: string): boolean {
    assertSafeId(id);
    try {
      rmSync(join(this.dir(collection), `${id}.json`));
      return true;
    } catch {
      return false;
    }
  }
}

let storeSingleton: DocumentStore | null = null;

/**
 * Store del proceso. DATA_DIR configura dónde persiste. Default: ./data en local;
 * en entornos serverless con FS de solo lectura (Vercel) cae a /tmp, que es
 * escribible — así el demo desplegado guarda informes y el health pasa.
 */
export function getStore(): DocumentStore {
  if (!storeSingleton) {
    const fallback = process.env.VERCEL ? "/tmp/data" : join(process.cwd(), "data");
    storeSingleton = new FileStore(process.env.DATA_DIR ?? fallback);
  }
  return storeSingleton;
}

/** Id ordenable por tiempo: timestamp base36 + sufijo aleatorio. */
export function newId(): string {
  const t = Date.now().toString(36).padStart(9, "0");
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}-${r}`;
}
