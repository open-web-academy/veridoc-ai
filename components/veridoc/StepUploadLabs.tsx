"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useTranslations } from "next-intl";
import { analyzeMedicalRecord } from "@/app/actions/analyze-medical-record";

const PDF_MIME = "application/pdf";

type StepUploadLabsProps = {
  labsFile: File | null;
  maxBytes: number;
  formatBytes: (bytes: number) => string;
  onFileSelect: (file: File) => void;
  onAnalysisComplete?: (markdown: string) => void;
  onClear: () => void;
  onContinue: () => void;
};

export const StepUploadLabs = ({
  labsFile,
  maxBytes,
  formatBytes,
  onFileSelect,
  onAnalysisComplete,
  onClear,
  onContinue,
}: StepUploadLabsProps) => {
  const t = useTranslations("stepUpload");
  const tCommon = useTranslations("common");
  const tResults = useTranslations("stepResults");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const analyzedFileRef = useRef<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Nuevos estados para el análisis
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (!labsFile) {
      setPreviewUrl(null);
      setIsPreviewOpen(false);
      setIsPdfPreviewOpen(false);
      setAnalysisResult(null);
      analyzedFileRef.current = null;
      return;
    }

    const url = URL.createObjectURL(labsFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [labsFile]);

  // When the file comes from the landing (initialLabsFile), run extraction here; in-step selection runs it in handleFile
  useEffect(() => {
    if (!labsFile || labsFile.type !== PDF_MIME) return;
    if (analyzedFileRef.current === labsFile) return;
    if (isLoading || analysisResult?.success) return;

    analyzedFileRef.current = labsFile;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      setAnalysisResult(null);
      try {
        const formData = new FormData();
        formData.append("file", labsFile);
        const result = await analyzeMedicalRecord(formData);
        if (!cancelled) {
          setAnalysisResult(result);
          if (result.success && "markdown" in result) {
            onAnalysisComplete?.(result.markdown);
          }
          if (!result.success && "message" in result) {
            setError(result.message || t("errorAnalyzing"));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(t("errorProcessing"));
          setAnalysisResult(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [labsFile]);

  const validateFile = (file: File) => {
    if (file.type !== PDF_MIME) {
      return t("pdfOnlyError");
    }
    if (file.size > maxBytes) {
      return t("tooLarge", { maxSize: formatBytes(maxBytes) });
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

    if (file.type === PDF_MIME) {
      analyzedFileRef.current = file;
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const result = await analyzeMedicalRecord(formData);
        setAnalysisResult(result);

        if (result.success && "markdown" in result) {
          onAnalysisComplete?.(result.markdown);
        }

        if (!result.success && "message" in result) {
          setError(result.message || t("errorAnalyzing"));
        }
      } catch (err) {
        setError(t("errorProcessing"));
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

  const isPdf = labsFile?.type === PDF_MIME;
  const canContinue = labsFile != null && analysisResult?.success === true;

  return (
    <section className="grid gap-6 pb-24 sm:pb-0">
      <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("title")}
          </h2>
          <p className="text-sm text-slate-600">
            {t("subtitle", { maxSize: formatBytes(maxBytes) })}
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
          className={`mt-5 cursor-pointer rounded-3xl border border-dashed px-5 py-7 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${isDragging
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
            accept={PDF_MIME}
            onChange={handleInputChange}
            className="hidden"
          />
          <p className="text-sm font-medium text-slate-700">
            {t("dropHere")}
          </p>
          <p className="mt-2 text-xs text-slate-500">{t("or")}</p>
          <button
            type="button"
            onClick={handleBrowse}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {t("browse")}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Lectura del archivo en curso */}
        {isLoading && labsFile ? (
          <div
            className="mt-5 flex flex-col items-center gap-4 rounded-2xl border-2 border-teal-200 bg-teal-50/80 px-6 py-8 text-center"
            role="status"
            aria-live="polite"
            aria-label={t("readingFile")}
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-teal-800">
                {t("readingProgress")}
              </p>
              <p className="text-xs text-teal-600 max-w-sm">
                {t("readingHint")}
              </p>
            </div>
            <p className="text-xs text-teal-500">{t("dontClose")}</p>
          </div>
        ) : null}

        {/* PDF success */}
        {analysisResult?.success && labsFile ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-semibold">{t("pdfSuccess")}</p>
            <p className="mt-1 text-xs">{t("pdfSuccessHint")}</p>
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
                      {labsFile.type || tResults("unknownType")} |{" "}
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
                    {t("removeFile")}
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
                    {tCommon("preview")}
                    <span className="text-xs font-semibold text-slate-500">
                      {isPreviewOpen ? tCommon("hide") : tCommon("show")}
                    </span>
                  </button>
                  {isPreviewOpen ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
                      {isPdf ? (
                        <div className="flex flex-col gap-3 p-4 text-sm text-slate-600">
                          <p>{t("pdfPreviewNote")}</p>
                          <button
                            type="button"
                            onClick={() => setIsPdfPreviewOpen(true)}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          >
                            {t("openPreview")}
                          </button>
                        </div>
                      ) : (
                        <div
                          className="max-h-80 overflow-auto bg-white p-3"
                          style={{ touchAction: "pan-x pan-y" }}
                        >
                          <img
                            src={previewUrl}
                            alt={t("labPreview")}
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
                    aria-label={t("labPreview")}
                  >
                    <div className="p-4 text-sm text-slate-600">
                      {t("previewUnavailable")}
                    </div>
                  </object>
                ) : (
                  <img
                    src={previewUrl}
                    alt={t("labPreview")}
                    className="h-72 w-full object-contain"
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/70 bg-[#f5fbfb]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
          {labsFile && isPdf && isLoading && (
            <p className="text-xs text-slate-500">{t("extracting")}</p>
          )}
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {tCommon("continue")}
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
              aria-label={t("labPreview")}
            >
              <div className="p-4 text-sm text-slate-600">
                {t("previewUnavailable")}
              </div>
            </object>
          </div>
        </div>
      ) : null}
    </section>
  );
};
