"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { analyzeMedicalRecord } from "@/app/actions/analyze-medical-record";
import { NearAIAnalysis } from "@/components/veridoc/NearAIAnalysis";

 const ACCEPTED_TYPES = [
   "application/pdf",
   "image/png",
   "image/jpeg",
 ];

 type StepUploadLabsProps = {
   labsFile: File | null;
   maxBytes: number;
   formatBytes: (bytes: number) => string;
   onFileSelect: (file: File) => void;
   onClear: () => void;
   onContinue: () => void;
 };

 export const StepUploadLabs = ({
   labsFile,
   maxBytes,
   formatBytes,
   onFileSelect,
   onClear,
   onContinue,
 }: StepUploadLabsProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  
  // Nuevos estados para el análisis
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    success: boolean;
    analysis?: {
      is_medical_record?: boolean;
      summary?: string;
      detected_diagnosis?: string;
      missing_info_warnings?: string[];
    };
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (!labsFile) {
      setPreviewUrl(null);
      setIsPreviewOpen(false);
      setIsPdfPreviewOpen(false);
      setAnalysisResult(null);
      return;
    }

    const url = URL.createObjectURL(labsFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [labsFile]);

   const validateFile = (file: File) => {
     if (!ACCEPTED_TYPES.includes(file.type)) {
       return "Please upload a PDF or image file (PNG, JPG, JPEG).";
     }
     if (file.size > maxBytes) {
       return `File is too large. Max size is ${formatBytes(maxBytes)}.`;
     }
     return null;
   };

  const handleFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setAnalysisResult(null);
      return;
    }
    setError(null);
    setAnalysisResult(null);
    onFileSelect(file);

    // Solo analizar si es PDF
    if (file.type === "application/pdf") {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await analyzeMedicalRecord(formData);
        setAnalysisResult(result);
        
        if (!result.success) {
          setError(result.message || 'Error al analizar el documento');
        }
      } catch (err) {
        setError('Error al procesar el archivo. Por favor, intenta de nuevo.');
        setAnalysisResult(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

   const handleBrowse = () => {
     inputRef.current?.click();
   };

   const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       handleFile(file);
     }
   };

   const handleDrop = (event: DragEvent<HTMLDivElement>) => {
     event.preventDefault();
     setIsDragging(false);
     const file = event.dataTransfer.files?.[0];
     if (file) {
       handleFile(file);
     }
   };

  const isPdf = labsFile?.type === "application/pdf";

   return (
    <section className="grid gap-6 pb-24 sm:pb-0">
      <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur sm:p-6">
         <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-slate-900">
             Upload your labs
           </h2>
           <p className="text-sm text-slate-600">
            Tap to add your lab report. Drag &amp; drop is optional on desktop.
            Accepted formats: PDF, PNG, JPG, JPEG. Max {formatBytes(maxBytes)}.
           </p>
         </div>

        <div
          role="button"
          tabIndex={0}
          onClick={handleBrowse}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleBrowse();
            }
          }}
          className={`mt-5 cursor-pointer rounded-3xl border border-dashed px-5 py-7 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
             isDragging
               ? "border-teal-400 bg-teal-50/60"
               : "border-slate-200 bg-white/80"
           }`}
           onDragOver={(event) => {
             event.preventDefault();
             setIsDragging(true);
           }}
           onDragLeave={() => setIsDragging(false)}
           onDrop={handleDrop}
         >
           <input
             ref={inputRef}
             type="file"
             accept={ACCEPTED_TYPES.join(",")}
             onChange={handleInputChange}
             className="hidden"
           />
           <p className="text-sm font-medium text-slate-700">
            Drop your lab file here
           </p>
           <p className="mt-2 text-xs text-slate-500">or</p>
           <button
             type="button"
             onClick={handleBrowse}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
           >
             Browse files
           </button>
         </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Indicador de carga */}
        {isLoading && labsFile ? (
          <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"></div>
              <span>Analizando documento médico...</span>
            </div>
          </div>
        ) : null}

        {/* Resultados del análisis */}
        {analysisResult?.success && analysisResult.analysis && labsFile ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
            {analysisResult.analysis.is_medical_record === false ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">⚠️ Documento no válido</p>
                <p className="mt-1 text-xs">Este archivo no parece ser un documento médico válido.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">Análisis del documento</h3>
                    {analysisResult.analysis.summary && (
                      <p className="mt-2 text-sm text-slate-700">
                        {analysisResult.analysis.summary}
                      </p>
                    )}
                  </div>
                </div>

                {analysisResult.analysis.detected_diagnosis && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-600">Diagnóstico detectado:</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {analysisResult.analysis.detected_diagnosis}
                    </p>
                  </div>
                )}

                {analysisResult.analysis.missing_info_warnings && 
                 analysisResult.analysis.missing_info_warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800">Advertencias:</p>
                    <ul className="mt-2 space-y-1">
                      {analysisResult.analysis.missing_info_warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-amber-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}

        {/* Paso 2: Análisis con Inteligencia Artificial */}
        {labsFile && isPdf && analysisResult?.success ? (
          <div className="mt-8 border-t border-slate-200 pt-8">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">
              Paso 2: Análisis con Inteligencia Artificial
            </h3>
            <NearAIAnalysis />
          </div>
        ) : null}

        {labsFile ? (
          <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {labsFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {labsFile.type || "Unknown type"} |{" "}
                      {formatBytes(labsFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAnalysisResult(null);
                      setIsLoading(false);
                      onClear();
                    }}
                    className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    Remove file
                  </button>
                </div>
              </div>

              {previewUrl ? (
                <div className="md:hidden">
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen((prev) => !prev)}
                    className="inline-flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    aria-expanded={isPreviewOpen}
                  >
                    Preview
                    <span className="text-xs font-semibold text-slate-500">
                      {isPreviewOpen ? "Hide" : "Show"}
                    </span>
                  </button>
                  {isPreviewOpen ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
                      {isPdf ? (
                        <div className="flex flex-col gap-3 p-4 text-sm text-slate-600">
                          <p>PDF preview opens full screen.</p>
                          <button
                            type="button"
                            onClick={() => setIsPdfPreviewOpen(true)}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          >
                            Open preview
                          </button>
                        </div>
                      ) : (
                        <div
                          className="max-h-80 overflow-auto bg-white p-3"
                          style={{ touchAction: "pan-x pan-y" }}
                        >
                          <img
                            src={previewUrl}
                            alt="Lab upload preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {previewUrl ? (
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:block">
                {isPdf ? (
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    className="h-72 w-full"
                    aria-label="Lab PDF preview"
                  >
                    <div className="p-4 text-sm text-slate-600">
                      Preview unavailable. Please download the file to view it.
                    </div>
                  </object>
                ) : (
                  <img
                    src={previewUrl}
                    alt="Lab upload preview"
                    className="h-72 w-full object-contain"
                  />
                )}
              </div>
            ) : null}
          </div>
         ) : null}
       </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/70 bg-[#f5fbfb]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onContinue}
            disabled={!labsFile}
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Continue
          </button>
        </div>
      </div>

      {isPdf && previewUrl && isPdfPreviewOpen ? (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-slate-950/70 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Lab PDF preview"
        >
          <div className="flex items-center justify-between bg-white/95 px-4 py-3 text-sm font-semibold text-slate-900">
            Lab preview
            <button
              type="button"
              onClick={() => setIsPdfPreviewOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Close
            </button>
          </div>
          <div className="flex-1 bg-white p-3">
            <object
              data={previewUrl}
              type="application/pdf"
              className="h-full w-full"
              aria-label="Lab PDF preview"
            >
              <div className="p-4 text-sm text-slate-600">
                Preview unavailable. Please download the file to view it.
              </div>
            </object>
          </div>
        </div>
      ) : null}
     </section>
   );
 };
