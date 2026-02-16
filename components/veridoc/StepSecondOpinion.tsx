"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Stethoscope, ShieldCheck, Eye, Loader2 } from "lucide-react";
import { getAnalysisIDB } from "@/lib/veridoc/idbStore";
import { useState } from "react";

type StepSecondOpinionProps = {
  analysisId?: string;
  onBack: () => void;
  onStartOver: () => void;
};

export const StepSecondOpinion = ({
  analysisId,
  onBack,
  onStartOver,
}: StepSecondOpinionProps) => {
  const t = useTranslations("stepSecondOpinion");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const [verifying, setVerifying] = useState(false);
  const marketplaceHref = analysisId ? `/marketplace?from=wizard&analysisId=${analysisId}` : "/marketplace?from=wizard";

  const handleVerifyIDB = async () => {
    if (!analysisId) return;
    setVerifying(true);
    try {
      const data = await getAnalysisIDB(analysisId);
      if (data && data.pdfFile) {
        const url = URL.createObjectURL(data.pdfFile);
        window.open(url, "_blank");
        // Optativo: revocar después de un tiempo o dejar que el navegador lo maneje
      } else {
        alert(t("fileNotFoundIDB"));
      }
    } catch (err) {
      console.error("Error verifying IDB", err);
      alert(t("errorAccessingIDB"));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="grid gap-6 pb-24 sm:pb-0">
      <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            {t("title")}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            {t("subtitle")}
          </p>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-teal-600" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">{t("anonymousTitle")}</p>
              <p className="mt-1">{t("anonymousBody")}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={marketplaceHref}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:shadow-lg active:scale-[0.98]"
          >
            {t("goToMarketplace")}
            <ChevronRight className="h-4 w-4 opacity-80" />
          </Link>

          {analysisId && (
            <button
              type="button"
              onClick={handleVerifyIDB}
              disabled={verifying}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-teal-200 bg-teal-50/50 px-4 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50"
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Ver PDF guardado en IndexedDB (Test)
            </button>
          )}
          <p className="text-center text-xs text-slate-500">
            {t("viewAnalyses")}{" "}
            <Link href="/analisis" className="font-medium text-teal-700 underline hover:text-teal-800">
              {tNav("analisis")}
            </Link>
            .
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t("otherActions")}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              {t("backToReport")}
            </button>
            <button
              type="button"
              onClick={onStartOver}
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              {t("startOver")}
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/70 bg-[#f5fbfb]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            {tCommon("back")}
          </button>
        </div>
      </div>
    </section>
  );
};
