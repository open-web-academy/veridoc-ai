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
    const res = await fetch("https://api.cloud.llamaindex.ai/api/parsing", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    const latencyMs = Date.now() - start;
    if (res.ok || res.status === 405) {
      return {
        name: serviceName,
        status: "ok",
        message: "API key válida, servicio disponible",
        latencyMs,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        name: serviceName,
        status: "error",
        message: "API key inválida o sin permisos",
        latencyMs,
      };
    }
    return {
      name: serviceName,
      status: "error",
      message:
        res.status === 404
          ? "Endpoint no disponible para verificación (404). La key está configurada; el servicio se usa al subir PDFs."
          : `Error del servicio (${res.status})`,
      latencyMs,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error de conexión";
    return {
      name: serviceName,
      status: "error",
      message: msg,
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
