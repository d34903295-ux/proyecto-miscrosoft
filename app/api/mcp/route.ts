// ─────────────────────────────────────────────────────────────
// El agente expuesto vía MCP (Model Context Protocol).
//
// Work IQ publica su API en preview por los protocolos A2A y MCP; este
// endpoint habla el mismo idioma: cualquier agente/cliente MCP (Copilot
// Studio, Claude, VS Code, etc.) puede descubrir e invocar el pre-mortem
// como herramienta. Implementa el transporte "Streamable HTTP" en su forma
// stateless: JSON-RPC 2.0 sobre POST con respuesta application/json.
//
//   initialize  → capacidades del servidor
//   tools/list  → expone `premortem`
//   tools/call  → ejecuta el agente y devuelve el reporte (texto + JSON)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { generatePreMortem } from "@/lib/agent";
import { guard } from "@/lib/guard";
import { inc, log, observe } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-06-18";

const TOOLS = [
  {
    name: "premortem",
    title: "Pre-Mortem Institucional",
    description:
      "Genera un reporte pre-mortem para un proyecto a punto de lanzarse: recupera de la " +
      "memoria institucional los proyectos pasados más parecidos que fracasaron, deriva los " +
      "modos de fallo probables (cada uno anclado a un caso real verificable), los somete a un " +
      "contraanálisis anti-confirmación, y reporta riesgos rankeados con mitigaciones, " +
      "preguntas pendientes y puntos ciegos de la memoria. Regla: recuerda, no inventa.",
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description:
            "Descripción del proyecto en lenguaje natural (qué se construye, para quién, " +
            "con qué equipo y qué apuesta). Mínimo ~20 caracteres.",
        },
      },
      required: ["description"],
    },
  },
];

function riskToText(report: Awaited<ReturnType<typeof generatePreMortem>>): string {
  const v = report.verdict;
  const lines = [
    `PRE-MORTEM · índice de riesgo ${v.riskIndex}/100 (${v.level})`,
    v.headline,
    "",
  ];
  for (const r of report.risks) {
    lines.push(
      `#${r.rank} [${r.failureCategory}] ${r.title} — confianza ${(r.confidence * 100).toFixed(0)}% (${r.refutation.stands})`
    );
    lines.push(`   evidencia: ${r.evidence.caseName} (${r.evidence.year}) · caso ${r.evidence.caseId}`);
    lines.push(`   mitigación: ${r.mitigation}`);
  }
  if (report.gaps.length) {
    lines.push("", "Preguntas pendientes:");
    for (const g of report.gaps) lines.push(`- ${g.question} (${g.failureCategory})`);
  }
  if (report.coverage.length) {
    lines.push("", "Puntos ciegos de la memoria (el silencio no es ausencia de riesgo):");
    for (const c of report.coverage) lines.push(`- ${c.dimension}: ${c.value}`);
  }
  if (report.board && report.costs) {
    lines.push(
      "",
      `Consejo (¿invertirías $${report.costs.budget.toLocaleString("en-US")}?): ${report.board.votes
        .map((vt) => `${vt.role}=${vt.vote}`)
        .join(" · ")} → ${report.board.invest.toUpperCase()}`,
      `Pérdida esperada total: $${report.costs.totalExpected.toLocaleString("en-US")}`
    );
  }
  if (report.pointOfNoReturn) {
    lines.push(
      `Punto de no retorno: ${report.pointOfNoReturn.whenLabel} (fracaso >${Math.round(report.pointOfNoReturn.failureProbability * 100)}% si no se resuelven las condiciones)`
    );
  }
  return lines.join("\n");
}

function rpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });
}

export async function POST(req: Request) {
  // Auth/rate-limit a nivel transporte (HTTP), como permite la spec MCP.
  const denied = guard(req, "mcp");
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error: cuerpo JSON inválido", 400);
  }

  const { id = null, method, params } = body ?? {};

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: {
          name: "pre-mortem-institucional",
          title: "Pre-Mortem Institucional (Reasoning Agent)",
          version: "1.1.0",
        },
        instructions:
          "Llama a la herramienta `premortem` con la descripción de un proyecto para obtener " +
          "sus modos de fallo probables, anclados a casos reales de la memoria institucional.",
      });

    // notificación post-initialize del ciclo de vida MCP: aceptar sin cuerpo.
    case "notifications/initialized":
      return new Response(null, { status: 202 });

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: TOOLS });

    case "tools/call": {
      if (params?.name !== "premortem")
        return rpcError(id, -32602, `Herramienta desconocida: ${params?.name}`);
      const description = String(params?.arguments?.description ?? "");
      if (description.trim().length < 20)
        return rpcResult(id, {
          content: [
            {
              type: "text",
              text: "Describe el proyecto con más detalle (mínimo ~20 caracteres).",
            },
          ],
          isError: true,
        });
      try {
        const t0 = Date.now();
        const report = await generatePreMortem(description);
        observe("mcp_call", Date.now() - t0);
        inc("mcp_calls");
        log("info", "premortem vía MCP", { ms: Date.now() - t0, riskIndex: report.verdict.riskIndex });
        return rpcResult(id, {
          content: [{ type: "text", text: riskToText(report) }],
          structuredContent: {
            verdict: report.verdict,
            risks: report.risks,
            gaps: report.gaps,
            coverage: report.coverage,
            board: report.board,
            costs: report.costs,
            pointOfNoReturn: report.pointOfNoReturn,
            funeral: report.funeral,
            trace: report.trace,
            generatedWith: report.generatedWith,
            retrieverUsed: report.retrieverUsed,
          },
        });
      } catch (err: any) {
        return rpcResult(id, {
          content: [{ type: "text", text: `Error generando el pre-mortem: ${err?.message}` }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(id, -32601, `Método no soportado: ${method}`);
  }
}

/** GET informativo para humanos que abren la URL en el navegador. */
export async function GET() {
  return NextResponse.json({
    server: "pre-mortem-institucional",
    protocol: `MCP ${PROTOCOL_VERSION} (Streamable HTTP, stateless)`,
    hint: "POST JSON-RPC 2.0: initialize | tools/list | tools/call {name:'premortem', arguments:{description}}",
    tools: TOOLS.map((t) => t.name),
  });
}
