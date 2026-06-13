// ─────────────────────────────────────────────────────────────
// Embeddings densos REALES vía un modelo de Microsoft Foundry.
//
// Por defecto usa GitHub Models (catálogo de Foundry), gratis con un token de
// GitHub — el mismo que ya usa el razonamiento. Convierte la recuperación de
// "TF-IDF / similitud léxica" a BÚSQUEDA SEMÁNTICA densa: empareja por
// significado, no por palabras compartidas. Es opcional y degrada con gracia:
// si falla o no hay token, el retriever cae al TF-IDF determinista.
// ─────────────────────────────────────────────────────────────

function endpointAndAuth(): { url: string; headers: Record<string, string>; model: string } | null {
  // Azure OpenAI embeddings (si está configurado) — máxima narrativa Foundry.
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_EMBEDDING_DEPLOYMENT) {
    const ep = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, "");
    const dep = process.env.AZURE_EMBEDDING_DEPLOYMENT;
    const ver = process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview";
    return {
      url: `${ep}/openai/deployments/${dep}/embeddings?api-version=${ver}`,
      headers: { "Content-Type": "application/json", "api-key": process.env.AZURE_OPENAI_API_KEY },
      model: dep,
    };
  }
  // GitHub Models (catálogo de Foundry) — gratis, sin tarjeta. Ruta del demo.
  if (process.env.GITHUB_TOKEN) {
    return {
      url: "https://models.github.ai/inference/embeddings",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
      model: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
    };
  }
  return null;
}

export function embeddingsAvailable(): boolean {
  return endpointAndAuth() !== null;
}

/** Nombre del modelo de embeddings activo (para mostrarlo / log). */
export function embeddingModelName(): string | null {
  return endpointAndAuth()?.model ?? null;
}

/** Embebe un lote de textos en una sola llamada. Devuelve un vector por texto. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const cfg = endpointAndAuth();
  if (!cfg) throw new Error("Sin proveedor de embeddings (define GITHUB_TOKEN o Azure OpenAI).");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: cfg.headers,
    body: JSON.stringify({ model: cfg.model, input: texts }),
  });
  if (!res.ok) throw new Error(`embeddings HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const rows: any[] = (data.data ?? []).slice().sort((a: any, b: any) => a.index - b.index);
  if (rows.length !== texts.length) throw new Error("respuesta de embeddings incompleta");
  return rows.map((r) => r.embedding as number[]);
}

/** Coseno entre dos vectores densos. Devuelve 0..1 (asumiendo embeddings ~normalizados). */
export function denseCosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
