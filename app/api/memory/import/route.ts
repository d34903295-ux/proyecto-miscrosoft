// Importación masiva de memoria institucional desde CSV.
//
// Las empresas reales tienen sus postmortems en hojas de cálculo: este
// endpoint las convierte en memoria viva del agente. Cada fila se valida
// campo a campo (mismas reglas que /api/memory) y se reporta fila por fila
// qué entró y qué no — sin importaciones silenciosamente rotas.
//
// Formato: cabecera con los campos del caso; listas (tech, ignoredSignals)
// separadas por "|" dentro de la celda. Ver plantilla en el README.

import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { inc, log } from "@/lib/logger";
import { addRecord } from "@/lib/memorystore";
import { validateCaseInput } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 200;

/** Parser CSV mínimo con soporte de comillas (RFC 4180 básico). */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export async function POST(req: Request) {
  const denied = guard(req, "memory-import");
  if (denied) return denied;

  // acepta text/csv directo o JSON {csv: "..."}
  let csv = "";
  const ctype = req.headers.get("content-type") ?? "";
  if (ctype.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    csv = String(body?.csv ?? "");
  } else {
    csv = await req.text();
  }
  if (csv.trim().length === 0) {
    return NextResponse.json(
      { error: "Envía el CSV en el cuerpo (text/csv) o como JSON {csv}." },
      { status: 400 }
    );
  }

  const rows = parseCSV(csv);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "El CSV necesita una cabecera y al menos una fila de datos." },
      { status: 400 }
    );
  }
  if (rows.length - 1 > MAX_ROWS) {
    return NextResponse.json({ error: `Máximo ${MAX_ROWS} filas por importación.` }, { status: 400 });
  }

  const header = rows[0].map((h) => h.trim());
  const LIST_FIELDS = new Set(["tech", "ignoredSignals"]);
  const added: string[] = [];
  const errors: { row: number; problems: string[] }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const obj: Record<string, unknown> = {};
    header.forEach((h, j) => {
      const raw = (rows[i][j] ?? "").trim();
      if (LIST_FIELDS.has(h)) {
        obj[h] = raw ? raw.split("|").map((s) => s.trim()).filter(Boolean) : [];
      } else if (h === "year" || h === "severity") {
        obj[h] = Number(raw);
      } else {
        obj[h] = raw;
      }
    });
    const result = validateCaseInput(obj);
    if (result.ok && result.value) {
      added.push(addRecord(result.value).id);
    } else {
      errors.push({ row: i + 1, problems: result.errors });
    }
  }

  inc("memory_import", added.length);
  log("info", "importación CSV de memoria", { agregados: added.length, rechazados: errors.length });
  return NextResponse.json(
    { added: added.length, ids: added, rejected: errors.length, errors },
    { status: added.length > 0 ? 201 : 400 }
  );
}
