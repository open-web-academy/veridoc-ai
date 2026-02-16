"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type ServiceStatus = "ok" | "error" | "unconfigured";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  message: string;
  latencyMs?: number;
  required?: boolean;
  envVars?: string[];
}

interface StatusCounts {
  ok: number;
  error: number;
  unconfigured: number;
  total: number;
}

interface EnvironmentInfo {
  nearNetwork: string;
  nodeEnv: string;
}

interface StatusResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  environment?: EnvironmentInfo;
  counts?: StatusCounts;
  services: ServiceCheck[];
}

const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds

function StatusBadge({ status }: { status: ServiceStatus }) {
  const styles = {
    ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    error: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    unconfigured:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
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

function OverallStatusIcon({
  status,
}: {
  status: "healthy" | "degraded" | "unhealthy";
}) {
  if (status === "healthy") {
    return (
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30">
        <svg
          className="w-6 h-6 text-emerald-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    );
  }
  if (status === "degraded") {
    return (
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30">
        <svg
          className="w-6 h-6 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30">
      <svg
        className="w-6 h-6 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
  );
}

function CountsSummary({ counts }: { counts: StatusCounts }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {counts.ok}
        </p>
        <p className="text-xs text-[var(--foreground)]/60">Operativos</p>
      </div>
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
          {counts.error}
        </p>
        <p className="text-xs text-[var(--foreground)]/60">Con error</p>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
          {counts.unconfigured}
        </p>
        <p className="text-xs text-[var(--foreground)]/60">Sin configurar</p>
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceCheck }) {
  return (
    <li className="rounded-xl border border-[var(--foreground)]/10 bg-[var(--background)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{service.name}</span>
        <StatusBadge status={service.status} />
      </div>
      <p className="mt-2 text-sm text-[var(--foreground)]/70">
        {service.message}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {service.latencyMs != null && (
          <span className="text-xs text-[var(--foreground)]/50">
            Latencia: {service.latencyMs} ms
          </span>
        )}
        {service.envVars && service.envVars.length > 0 && (
          <span className="text-xs text-[var(--foreground)]/40">
            {service.envVars.map((v) => (
              <code
                key={v}
                className="mr-1 rounded bg-[var(--foreground)]/5 px-1 py-0.5"
              >
                {v}
              </code>
            ))}
          </span>
        )}
      </div>
    </li>
  );
}

export default function StatusPage() {
  const t = useTranslations("status");
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStatus = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
        setError(null);
        setLastRefresh(new Date());
      } catch (e) {
        setError(
          e instanceof Error ? e.message : t("errorLoading")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t]
  );

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchStatus(), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefresh, fetchStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-6">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[var(--foreground)]/10" />
          <div className="h-6 w-48 bg-[var(--foreground)]/10 rounded" />
          <div className="h-4 w-32 bg-[var(--foreground)]/5 rounded" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 mx-auto">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-red-600 dark:text-red-400">
            {t("errorLoading")}
          </h1>
          <p className="text-sm text-[var(--foreground)]/70">{error}</p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchStatus();
              }}
              className="text-sm text-[var(--foreground)]/80 hover:underline"
            >
              {t("retry")}
            </button>
            <Link
              href="/"
              className="text-sm text-[var(--foreground)]/80 hover:underline"
            >
              {t("backToHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const overallLabel =
    data.status === "healthy"
      ? t("allOperational")
      : data.status === "degraded"
        ? t("degraded")
        : t("unhealthy");

  const overallColor =
    data.status === "healthy"
      ? "text-emerald-600 dark:text-emerald-400"
      : data.status === "degraded"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const requiredServices = data.services.filter((s) => s.required !== false);
  const optionalServices = data.services.filter((s) => s.required === false);

  const counts = data.counts ?? {
    ok: data.services.filter((s) => s.status === "ok").length,
    error: data.services.filter((s) => s.status === "error").length,
    unconfigured: data.services.filter((s) => s.status === "unconfigured")
      .length,
    total: data.services.length,
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--foreground)]/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)] transition-colors"
          >
            &larr; Veridoc
          </Link>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-[var(--foreground)]/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-[var(--foreground)]/20 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              Auto
            </label>
            <span className="text-xs text-[var(--foreground)]/50">
              {lastRefresh
                ? lastRefresh.toLocaleTimeString("es", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Overall status */}
        <div className="flex items-center gap-4 mb-2">
          <OverallStatusIcon status={data.status} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Estado de servicios
            </h1>
            <p className={`text-sm font-medium ${overallColor}`}>
              {overallLabel}
            </p>
          </div>
        </div>

        {/* Environment info */}
        {data.environment && (
          <div className="mt-4 mb-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--foreground)]/10 bg-[var(--foreground)]/5 px-2.5 py-0.5 text-xs text-[var(--foreground)]/60">
              Red: <strong>{data.environment.nearNetwork}</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--foreground)]/10 bg-[var(--foreground)]/5 px-2.5 py-0.5 text-xs text-[var(--foreground)]/60">
              Entorno: <strong>{data.environment.nodeEnv}</strong>
            </span>
          </div>
        )}

        {/* Error banner (non-fatal — we still have data) */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
            Último refresh falló: {error}
          </div>
        )}

        {/* Summary counts */}
        <CountsSummary counts={counts} />

        {/* What we verify */}
        <div className="mb-6 rounded-xl border border-[var(--foreground)]/10 bg-[var(--foreground)]/5 p-4 text-sm text-[var(--foreground)]/80">
          <p className="font-medium text-[var(--foreground)] mb-2">Servicios verificados</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Privy</strong> — login y wallets</li>
            <li><strong>NEAR RPC</strong> — nodo blockchain</li>
            <li><strong>NEAR funding</strong> — activación de cuentas nuevas (faucet)</li>
            <li><strong>NEAR relay</strong> — retiros USDT (gasless)</li>
            <li><strong>LlamaParse</strong> — análisis de PDFs (historias clínicas)</li>
            <li><strong>NEAR AI</strong> — análisis con IA</li>
            <li><strong>Cloudinary</strong> — fotos y documentos de especialistas</li>
            <li><strong>NEAR Intents Solver</strong> — retiros a otras redes (POA)</li>
            <li><strong>API verificación especialistas</strong> — backend de marketplace y perfiles</li>
            <li><strong>Escrow</strong> — depósito y liberación de pagos (segunda opinión)</li>
            <li><strong>Escrow en NEAR</strong> — cuenta escrow existente on-chain</li>
            <li><strong>Cron release escrow</strong> — liberación automática de pagos a especialistas</li>
          </ul>
        </div>

        {/* Hosting hint */}
        {(data.status === "degraded" || data.status === "unhealthy") && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">
              ¿Estás en producción (Amplify, Vercel, etc.)?
            </p>
            <p className="mt-1 text-[var(--foreground)]/80">
              El archivo{" "}
              <code className="rounded bg-[var(--foreground)]/10 px-1">
                .env
              </code>{" "}
              no se sube al repositorio. Configura las variables de entorno en
              la consola de tu hosting. Ver{" "}
              <code className="rounded bg-[var(--foreground)]/10 px-1">
                docs/AMPLIFY_ENV.md
              </code>
              .
            </p>
          </div>
        )}

        {/* Required services */}
        {requiredServices.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-[var(--foreground)]/80 mb-3">
              Requeridos para correr la app ({requiredServices.filter((s) => s.status === "ok").length}/{requiredServices.length})
            </h2>
            <ul className="space-y-4 mb-8">
              {requiredServices.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </ul>
          </>
        )}

        {/* Optional services */}
        {optionalServices.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-[var(--foreground)]/80 mb-3">
              Opcionales — funciones específicas ({optionalServices.filter((s) => s.status === "ok").length}/{optionalServices.length})
            </h2>
            <ul className="space-y-4">
              {optionalServices.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </ul>
          </>
        )}

        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)] underline disabled:opacity-50 transition-colors"
          >
            {refreshing && (
              <svg
                className="animate-spin h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            {refreshing ? "Actualizando..." : "Actualizar estado"}
          </button>
        </p>
      </main>
    </div>
  );
}
