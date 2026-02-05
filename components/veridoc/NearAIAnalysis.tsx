"use client";

import { useState } from "react";
import { analyzeWithNearAI } from "@/app/actions/analyze-near";

/**
 * Componente para analizar documentos con NEAR AI
 * 
 * Muestra un botón que lee el archivo debug_extraction.md local
 * y lo envía a NEAR AI para análisis.
 */
export const NearAIAnalysis = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    content?: string;
    error?: string;
  } | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await analyzeWithNearAI();
      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || "Error desconocido al analizar"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Análisis con NEAR AI
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Analiza el documento extraído usando inteligencia artificial
          </p>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-5 text-xs font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Analizando...
            </>
          ) : (
            "Analizar con NEAR AI"
          )}
        </button>
      </div>

      {/* Indicador de carga */}
      {isLoading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span>Enviando documento a NEAR AI...</span>
          </div>
        </div>
      )}

      {/* Resultado exitoso */}
      {result?.success && result.content && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-green-800">
            ✅ Análisis completado
          </p>
          <div className="max-h-96 overflow-auto rounded-lg bg-white p-3 text-sm text-slate-700">
            <pre className="whitespace-pre-wrap font-sans">
              {result.content}
            </pre>
          </div>
        </div>
      )}

      {/* Error */}
      {result && !result.success && result.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-semibold">❌ Error</p>
          <p className="mt-1 text-xs">{result.error}</p>
        </div>
      )}
    </div>
  );
};
