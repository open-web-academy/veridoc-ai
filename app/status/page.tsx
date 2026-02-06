"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ServiceStatus = "ok" | "error" | "unconfigured";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  message: string;
  latencyMs?: number;
}

interface StatusResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: ServiceCheck[];
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const styles = {
    ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    error: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    unconfigured: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  };
  const labels = {
    ok: "Operativo",
    error: "Error",
    unconfigured: "No configurado",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "ok"
            ? "bg-emerald-500"
            : status === "error"
              ? "bg-red-500"
              : "bg-amber-500"
        }`}
      />
      {labels[status]}
    </span>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error al cargar el estado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-6">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-48 bg-[var(--foreground)]/10 rounded" />
          <div className="h-4 w-32 bg-[var(--foreground)]/5 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-red-600 dark:text-red-400">
            Error al cargar el estado
          </h1>
          <p className="text-sm text-[var(--foreground)]/70">{error}</p>
          <Link
            href="/"
            className="inline-block text-sm text-[var(--foreground)]/80 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const overallLabel =
    data.status === "healthy"
      ? "Todos los servicios operativos"
      : data.status === "degraded"
        ? "Algunos servicios no configurados"
        : "Hay servicios con errores";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--foreground)]/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)]"
          >
            ← Veridoc
          </Link>
          <span className="text-xs text-[var(--foreground)]/50">
            Actualizado:{" "}
            {new Date(data.timestamp).toLocaleTimeString("es", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Estado de servicios
        </h1>
        <p className="text-sm text-[var(--foreground)]/60 mb-8">
          {overallLabel}
        </p>

        {data.services.some((s) => s.status === "unconfigured") && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">¿Estás en producción (Amplify, Vercel, etc.)?</p>
            <p className="mt-1 text-[var(--foreground)]/80">
              El archivo <code className="rounded bg-[var(--foreground)]/10 px-1">.env</code> no se sube al repositorio. Debes configurar las variables de entorno en la consola de tu hosting. Ver{" "}
              <code className="rounded bg-[var(--foreground)]/10 px-1">docs/AMPLIFY_ENV.md</code>.
            </p>
          </div>
        )}

        <ul className="space-y-4">
          {data.services.map((service) => (
            <li
              key={service.name}
              className="rounded-xl border border-[var(--foreground)]/10 bg-[var(--background)] p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{service.name}</span>
                <StatusBadge status={service.status} />
              </div>
              <p className="mt-2 text-sm text-[var(--foreground)]/70">
                {service.message}
              </p>
              {service.latencyMs != null && (
                <p className="mt-1 text-xs text-[var(--foreground)]/50">
                  Latencia: {service.latencyMs} ms
                </p>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)] underline"
          >
            Actualizar estado
          </button>
        </p>
      </main>
    </div>
  );
}
