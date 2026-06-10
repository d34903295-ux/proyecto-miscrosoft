// ─────────────────────────────────────────────────────────────
// Similitud de texto TF-IDF + coseno, en TS puro (sin dependencias,
// sin descargas de modelos, sin API key). Suficiente y robusto para
// recuperar entre decenas/cientos de registros en un laptop.
// ─────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "y", "o",
  "que", "en", "a", "con", "por", "para", "se", "su", "sus", "al", "lo", "es",
  "como", "más", "mas", "pero", "sin", "no", "ni", "le", "les", "ya", "muy",
  "fue", "ser", "son", "este", "esta", "esto", "estos", "estas", "tras", "entre",
  "sobre", "cada", "cuando", "donde", "porque", "nos", "nuestro", "nuestra",
  "the", "and", "for", "with", "this", "that", "from", "was", "were", "are",
]);

/** Normaliza: minúsculas, sin acentos, solo letras/números. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos (diacríticos combinantes)
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

interface Vectorizer {
  idf: Map<string, number>;
  vectors: Map<string, number>[];
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/** Construye los vectores TF-IDF para un corpus de documentos. */
export function buildVectorizer(docs: string[]): Vectorizer {
  const tokenized = docs.map(tokenize);
  const df = new Map<string, number>();
  for (const tokens of tokenized) {
    for (const term of new Set(tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const N = docs.length;
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
  }
  const vectors = tokenized.map((tokens) => {
    const tf = termFreq(tokens);
    const vec = new Map<string, number>();
    for (const [term, count] of tf) {
      vec.set(term, count * (idf.get(term) ?? 0));
    }
    return vec;
  });
  return { idf, vectors };
}

/** Vectoriza una query nueva con el idf ya aprendido. */
export function vectorizeQuery(
  query: string,
  idf: Map<string, number>
): Map<string, number> {
  const tf = termFreq(tokenize(query));
  const vec = new Map<string, number>();
  for (const [term, count] of tf) {
    // términos no vistos en el corpus reciben un idf neutro pequeño.
    vec.set(term, count * (idf.get(term) ?? 1));
  }
  return vec;
}

/** Coseno entre dos vectores dispersos. Devuelve 0..1. */
export function cosine(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const v of a.values()) normA += v * v;
  for (const v of b.values()) normB += v * v;
  if (normA === 0 || normB === 0) return 0;
  // itera el vector más pequeño
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [term, v] of small) {
    const w = big.get(term);
    if (w !== undefined) dot += v * w;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
