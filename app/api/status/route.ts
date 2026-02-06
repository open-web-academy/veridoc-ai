import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ServiceStatus = "ok" | "error" | "unconfigured";

interface CheckResult {
  name: string;
  status: ServiceStatus;
  message: string;
  latencyMs?: number;
}

async function checkMongoDB(): Promise<CheckResult> {
  const start = Date.now();
  try {
    if (!process.env.MONGODB_URI) {
      return {
        name: "MongoDB",
        status: "unconfigured",
        message: "MONGODB_URI no está configurada",
      };
    }
    const conn = await dbConnect();
    const db = conn.connection.db;
    if (!db) {
      return {
        name: "MongoDB",
        status: "error",
        message: "No se pudo obtener la instancia de la base de datos",
        latencyMs: Date.now() - start,
      };
    }
    await db.admin().command({ ping: 1 });
    return {
      name: "MongoDB",
      status: "ok",
      message: `Conectado (${conn.connection.name})`,
      latencyMs: Date.now() - start,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return {
      name: "MongoDB",
      status: "error",
      message: msg,
      latencyMs: Date.now() - start,
    };
  }
}

// PDF mínimo válido (~178 bytes) para probar upload sin consumir quota real
const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF",
  "utf8"
);

const LLAMA_API_URL = "https://api.cloud.llamaindex.ai/api/parsing";

async function checkLlamaCloud(): Promise<CheckResult> {
  const start = Date.now();
  const key = process.env.LLAMA_CLOUD_API_KEY;
  const serviceName = "LlamaParse";
  if (!key) {
    return {
      name: serviceName,
      status: "unconfigured",
      message: "LLAMA_CLOUD_API_KEY no está configurada",
    };
  }
  try {
    const form = new FormData();
    form.append(
      "file",
      new Blob([MINIMAL_PDF], { type: "application/pdf" }),
      "status-check.pdf"
    );
    const res = await fetch(`${LLAMA_API_URL}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const jobId = data.id ?? data.job_id;
      return {
        name: serviceName,
        status: "ok",
        message: jobId
          ? "Upload de prueba correcto; servicio accesible desde este servidor."
          : "Servicio respondió correctamente.",
        latencyMs,
      };
    }
    const errBody = await res.text();
    let detail = errBody.slice(0, 200);
    try {
      const j = JSON.parse(errBody);
      detail = j.detail ?? j.message ?? detail;
    } catch {
      /* use errBody slice */
    }
    if (res.status === 401 || res.status === 403) {
      return {
        name: serviceName,
        status: "error",
        message: `API key inválida o sin permisos: ${detail}`,
        latencyMs,
      };
    }
    return {
      name: serviceName,
      status: "error",
      message: `Error ${res.status} desde LlamaParse: ${detail}`,
      latencyMs,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return {
      name: serviceName,
      status: "error",
      message: `No se pudo conectar con LlamaParse (¿firewall/red en producción?): ${msg}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function checkNearAI(): Promise<CheckResult> {
  const start = Date.now();
  const key = process.env.NEAR_AI_API_KEY;
  if (!key) {
    return {
      name: "NEAR AI",
      status: "unconfigured",
      message: "NEAR_AI_API_KEY no está configurada",
    };
  }
  try {
    const res = await fetch("https://cloud-api.near.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 1,
      }),
    });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return {
        name: "NEAR AI",
        status: "ok",
        message: "API key válida, servicio disponible",
        latencyMs,
      };
    }
    const body = await res.json().catch(() => ({}));
    const detail = body?.error?.message || body?.detail || res.statusText;
    if (res.status === 401 || res.status === 403) {
      return {
        name: "NEAR AI",
        status: "error",
        message: `API key inválida o sin permisos: ${detail}`,
        latencyMs,
      };
    }
    return {
      name: "NEAR AI",
      status: "error",
      message: `${res.status}: ${detail}`,
      latencyMs,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error de conexión";
    return {
      name: "NEAR AI",
      status: "error",
      message: msg,
      latencyMs: Date.now() - start,
    };
  }
}

export async function GET() {
  const [mongo, llama, near] = await Promise.all([
    checkMongoDB(),
    checkLlamaCloud(),
    checkNearAI(),
  ]);

  const checks = [mongo, llama, near];
  const allOk = checks.every((c) => c.status === "ok");
  const anyUnconfigured = checks.some((c) => c.status === "unconfigured");

  return NextResponse.json({
    status: allOk ? "healthy" : anyUnconfigured ? "degraded" : "unhealthy",
    timestamp: new Date().toISOString(),
    services: checks,
  });
}
