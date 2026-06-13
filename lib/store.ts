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
  // Capa en memoria (por instancia): hace fiables los permalinks recién creados
  // aunque el FS sea efímero/de solo lectura (serverless). El archivo es la
  // durabilidad best-effort; la memoria es la fuente rápida dentro de la instancia.
  private mem = new Map<string, unknown>();

  constructor(private baseDir: string) {}

  private key(collection: string, id: string): string {
    return `${collection}/${id}`;
  }

  private dir(collection: string): string {
    assertSafeId(collection);
    const d = join(this.baseDir, collection);
    mkdirSync(d, { recursive: true });
    return d;
  }

  put(collection: string, id: string, doc: unknown): void {
    // Validar SIEMPRE antes del try (no enmascarar path traversal con el catch).
    assertSafeId(collection);
    assertSafeId(id);
    this.mem.set(this.key(collection, id), doc);
    try {
      const dir = this.dir(collection);
      const tmp = join(dir, `.${id}.tmp`);
      writeFileSync(tmp, JSON.stringify(doc), "utf8");
      renameSync(tmp, join(dir, `${id}.json`)); // atómico en el mismo filesystem
    } catch {
      // FS de solo lectura: la copia en memoria sigue sirviendo en esta instancia
    }
  }

  get<T>(collection: string, id: string): T | null {
    assertSafeId(collection);
    assertSafeId(id);
    const cached = this.mem.get(this.key(collection, id));
    if (cached !== undefined) return cached as T;
    try {
      const doc = JSON.parse(
        readFileSync(join(this.dir(collection), `${id}.json`), "utf8")
      ) as T;
      this.mem.set(this.key(collection, id), doc);
      return doc;
    } catch {
      return null;
    }
  }

  list<T>(collection: string, limit = 100): { id: string; doc: T }[] {
    assertSafeId(collection);
    const byId = new Map<string, T>();
    // archivo (durabilidad)
    try {
      const dir = this.dir(collection);
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        if (!f.isFile() || !f.name.endsWith(".json")) continue;
        const id = f.name.slice(0, -5);
        const doc = this.get<T>(collection, id);
        if (doc !== null) byId.set(id, doc);
      }
    } catch {
      // sin FS: usamos solo memoria
    }
    // memoria (recién creados / FS no escribible) — pisa al archivo
    const prefix = `${collection}/`;
    for (const [k, v] of this.mem) {
      if (k.startsWith(prefix)) byId.set(k.slice(prefix.length), v as T);
    }
    return [...byId.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // ids con timestamp → recientes primero
      .slice(0, limit)
      .map(([id, doc]) => ({ id, doc }));
  }

  delete(collection: string, id: string): boolean {
    assertSafeId(collection);
    assertSafeId(id);
    const had = this.mem.delete(this.key(collection, id));
    try {
      rmSync(join(this.dir(collection), `${id}.json`));
      return true;
    } catch {
      return had;
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
