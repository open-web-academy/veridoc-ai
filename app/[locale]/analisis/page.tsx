"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getAnalyses,
  removeAnalysis,
  clearAnalyses,
  type SavedAnalysis,
} from "@/lib/veridoc/analysesStore";
import { NavBar } from "@/components/NavBar";
import {
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import {
  getConsultationsByPatientAction,
  getConsultationsBySpecialistAction
} from "@/app/actions/consultations";
import { ConsultationResponseModal } from "./ConsultationResponseModal";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  switch (status) {
    case "pending":
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-100">
          <Clock className="h-3 w-3" />
          {t("statusPending")}
        </span>
      );
    case "completed":
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
          <CheckCircle2 className="h-3 w-3" />
          {t("statusCompleted")}
        </span>
      );
    case "rejected":
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-100">
          <AlertCircle className="h-3 w-3" />
          {t("statusRejected")}
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
}

function ConsultationCard({
  consultation,
  isSpecialistView = false,
  onDictaminar,
  t,
}: {
  consultation: any;
  isSpecialistView?: boolean;
  onDictaminar?: () => void;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-slate-900">
              {t("consultationRequestTitle")}
            </span>
            <StatusBadge status={consultation.status} t={t} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(consultation.createdAt)}
          </p>
          <div className="mt-3 flex items-center gap-2 overflow-hidden">
            <FileText className="h-4 w-4 shrink-0 text-teal-600" />
            <a
              href={consultation.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs font-medium text-teal-700 underline hover:text-teal-800"
            >
              {t("viewAnalysis")}
            </a>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <p className="text-xs text-slate-500 font-semibold text-teal-700">
            {t("specialistLabel")} {consultation.specialistName}
          </p>
          <span className="text-[10px] font-mono font-medium text-slate-400">
            {consultation.specialistAccount.slice(0, 8)}...{consultation.specialistAccount.slice(-4)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-4 w-4" />
            {t("closeDetail")}
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            {t("viewDetailsAndComments")}
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("patientSummaryTitle")}
            </h4>
            <p className="mt-1 leading-relaxed text-slate-700">
              {consultation.analysisCommentsAI || t("noAdditionalComments")}
            </p>
          </div>
          {consultation.analysisCommentsSpecialist ? (
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                {t("specialistResponseTitle")}
              </h4>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-800 font-medium">
                {consultation.analysisCommentsSpecialist}
              </p>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs italic text-slate-400">{t("waitingSpecialistResponse")}</p>
            </div>
          )}
        </div>
      )}

      {isSpecialistView && consultation.status === "pending" && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onDictaminar}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition shadow-sm"
          >
            <Stethoscope className="h-4 w-4" />
            {t("dictaminarButton")}
          </button>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({
  analysis,
  onRemove,
  t,
}: {
  analysis: SavedAnalysis;
  onRemove: () => void;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const summaryPreview =
    analysis.report.summary.length > 120
      ? analysis.report.summary.slice(0, 120) + "…"
      : analysis.report.summary;

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-slate-400" />
            <span className="truncate font-semibold text-slate-900">
              {analysis.labFileName}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(analysis.createdAt)}
          </p>
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">
            {summaryPreview}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <Link
            href={`/marketplace?from=analisis&analysisId=${analysis.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Stethoscope className="h-4 w-4" />
            {t("secondOpinion")}
          </Link>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            aria-label={t("removeAria")}
          >
            <Trash2 className="h-4 w-4" />
            {t("remove")}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-4 w-4" />
            {t("hideSummary")}
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            {t("viewFullSummary")}
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("summary")}
            </h4>
            <p className="mt-1 leading-relaxed text-slate-700">
              {analysis.report.summary}
            </p>
          </div>
          {analysis.report.keyItems.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("keyItems")}
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {analysis.report.keyItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.report.nextSteps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("nextSteps")}
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {analysis.report.nextSteps.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.report.questions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("questionsForDoctor")}
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {analysis.report.questions.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.report.extraInfo && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("additionalInfo")}
              </h4>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-700">
                {analysis.report.extraInfo}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalisisPage() {
  const t = useTranslations("analisis");
  const { user } = usePrivy();
  const [activeTab, setActiveTab] = useState<"local" | "consultations" | "specialist">("local");
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [specialistConsultations, setSpecialistConsultations] = useState<any[]>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [specialistProfile, setSpecialistProfile] = useState<{
    nearAddress?: string;
    consultationPrice?: number;
  } | null>(null);
  const [selectedConsultationForDictamen, setSelectedConsultationForDictamen] = useState<any | null>(null);

  const refreshLocal = useCallback(() => {
    setAnalyses(getAnalyses());
  }, []);

  const refreshConsultations = useCallback(async () => {
    const address = user?.wallet?.address;
    if (!address) return;
    setIsLoadingConsultations(true);
    try {
      const result = await getConsultationsByPatientAction(address);
      if (result.success && result.data) {
        setConsultations(result.data);
      }
    } catch (err) {
      console.error("Error fetching consultations", err);
    } finally {
      setIsLoadingConsultations(false);
    }
  }, [user]);

  const refreshSpecialistConsultations = useCallback(async () => {
    const address = user?.wallet?.address;
    if (!address) return;
    setIsLoadingConsultations(true);
    try {
      const result = await getConsultationsBySpecialistAction(address);
      if (result.success && result.data) {
        setSpecialistConsultations(result.data);
      }
    } catch (err) {
      console.error("Error fetching specialist consultations", err);
    } finally {
      setIsLoadingConsultations(false);
    }
  }, [user]);

  // Check if current user is a specialist and load profile (for payout: nearAddress, consultationPrice)
  useEffect(() => {
    const address = user?.wallet?.address;
    if (!address) {
      setIsSpecialist(false);
      setSpecialistProfile(null);
      return;
    }
    fetch(`/api/specialists/identifier/${encodeURIComponent(address)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const profile = data?.data ?? data;
        const verified = !!profile && (profile.status === "Verified" || profile.status === "Verificado");
        setIsSpecialist(verified);
        setSpecialistProfile(
          verified && profile
            ? {
                nearAddress: profile.nearAddress ?? profile.near_address,
                consultationPrice:
                  profile.consultationPrice ?? profile.consultation_price ?? 0,
              }
            : null
        );
      })
      .catch(() => {
        setIsSpecialist(false);
        setSpecialistProfile(null);
      });
  }, [user]);

  useEffect(() => {
    if (activeTab === "local") {
      refreshLocal();
    } else if (activeTab === "consultations") {
      refreshConsultations();
    } else {
      refreshSpecialistConsultations();
    }
  }, [activeTab, refreshLocal, refreshConsultations, refreshSpecialistConsultations]);

  const handleRemove = useCallback((id: string) => {
    removeAnalysis(id);
    setAnalyses(getAnalyses());
  }, []);

  const handleClearAll = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!confirm(t("confirmClearAll"))) return;
    clearAnalyses();
    setAnalyses([]);
  }, [t]);

  return (
    <div className="min-h-screen bg-[#f6fbfb] text-slate-900">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-teal-200/40 via-sky-200/30 to-white blur-3xl" />
        <div className="absolute left-0 top-40 h-80 w-80 rounded-full bg-gradient-to-tr from-cyan-200/30 via-emerald-200/20 to-white blur-3xl" />
      </div>

      <div className="relative z-10">
        <NavBar />

        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 lg:px-10">
          <section className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-slate-600">{t("description")}</p>
          </section>

          {/* TABS */}
          <div className="mb-8 flex flex-wrap gap-1 p-1 rounded-2xl bg-slate-100 w-fit">
            <button
              onClick={() => setActiveTab("local")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "local"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {t("tabLocal")}
            </button>
            <button
              onClick={() => setActiveTab("consultations")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "consultations"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {t("tabConsultations")}
            </button>
            {isSpecialist && (
              <button
                onClick={() => setActiveTab("specialist")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-l border-slate-200 transition ${activeTab === "specialist"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {t("tabSpecialist")}
              </button>
            )}
          </div>

          {activeTab === "local" ? (
            <>
              {analyses.length > 0 ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      {t("analysesSaved", { count: analyses.length })}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-sm font-medium text-slate-600 underline hover:text-red-600"
                    >
                      {t("clearAll")}
                    </button>
                  </div>
                  <ul className="grid gap-6">
                    {analyses.map((analysis) => (
                      <li key={analysis.id}>
                        <AnalysisCard
                          analysis={analysis}
                          onRemove={() => handleRemove(analysis.id)}
                          t={t}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/40 py-16 text-center">
                  <div className="mb-4 rounded-full bg-slate-100 p-4">
                    <Inbox className="h-10 w-10 text-slate-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t("noAnalysesYet")}
                  </h2>
                  <p className="mt-2 max-w-sm text-slate-600">
                    {t("noAnalysesHint")}
                  </p>
                  <Link
                    href="/veridoc"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {t("goToWizard")}
                  </Link>
                </div>
              )}
            </>
          ) : activeTab === "consultations" ? (
            <>
              {isLoadingConsultations ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  <p className="mt-3 text-sm text-slate-500">{t("loadingConsultations")}</p>
                </div>
              ) : consultations.length > 0 ? (
                <ul className="grid gap-6">
                  {consultations.map((consultation) => (
                    <li key={consultation._id}>
                      <ConsultationCard consultation={consultation} t={t} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/40 py-16 text-center">
                  <div className="mb-4 rounded-full bg-slate-100 p-4">
                    <Stethoscope className="h-10 w-10 text-slate-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t("noRequestsTitle")}
                  </h2>
                  <p className="mt-2 max-w-sm text-slate-600">
                    {t("noRequestsHint")}
                  </p>
                  <Link
                    href="/marketplace"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                  >
                    {t("goToMarketplace")}
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              {isLoadingConsultations ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  <p className="mt-3 text-sm text-slate-500">{t("loadingDictamenes")}</p>
                </div>
              ) : specialistConsultations.length > 0 ? (
                <ul className="grid gap-6">
                  {specialistConsultations.map((consultation) => (
                    <li key={consultation._id}>
                      <ConsultationCard
                        consultation={consultation}
                        isSpecialistView={true}
                        onDictaminar={() => setSelectedConsultationForDictamen(consultation)}
                        t={t}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/40 py-16 text-center">
                  <div className="mb-4 rounded-full bg-slate-100 p-4">
                    <Inbox className="h-10 w-10 text-slate-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t("noDictamenesTitle")}
                  </h2>
                  <p className="mt-2 max-w-sm text-slate-600">
                    {t("noDictamenesHint")}
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {selectedConsultationForDictamen && (
        <ConsultationResponseModal
          isOpen={true}
          consultationId={selectedConsultationForDictamen._id}
          patientAccount={selectedConsultationForDictamen.patientAccount}
          specialistAccount={
            specialistProfile?.nearAddress ??
            selectedConsultationForDictamen.specialistAccount ??
            user?.wallet?.address ??
            ""
          }
          amountUsdt={
            specialistProfile?.consultationPrice ??
            selectedConsultationForDictamen.consultationPrice ??
            selectedConsultationForDictamen.priceUsdt ??
            0
          }
          onClose={() => setSelectedConsultationForDictamen(null)}
          onSuccess={() => {
            refreshSpecialistConsultations();
            setSelectedConsultationForDictamen(null);
          }}
        />
      )}
    </div>
  );
}
