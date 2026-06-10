// Memoria institucional viva: consultar estadísticas y AGREGAR casos en
// runtime. Un caso agregado entra al índice de recuperación inmediatamente
// (el vectorizador se reconstruye vía versión de memoria).

import { NextResponse } from "next/server";
import { guard, rateLimit } from "@/lib/guard";
import { inc, log } from "@/lib/logger";
import { addRecord, memoryStats } from "@/lib/memorystore";
import { validateCaseInput } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = rateLimit(req, "memory");
  if (denied) return denied;
  return NextResponse.json(memoryStats());
}

export async function POST(req: Request) {
  // escritura: exige API key si está configurada
  const denied = guard(req, "memory-add");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const result = validateCaseInput(body);
  if (!result.ok || !result.value) {
    inc("memory_add_invalid");
    return NextResponse.json(
      { error: "Caso inválido.", details: result.errors },
      { status: 400 }
    );
  }

  try {
    const record = addRecord(result.value);
    inc("memory_added");
    return NextResponse.json({ added: record.id, record }, { status: 201 });
  } catch (err: any) {
    log("error", "error agregando caso", { err: err?.message });
    return NextResponse.json({ error: "No se pudo persistir el caso." }, { status: 500 });
  }
}
