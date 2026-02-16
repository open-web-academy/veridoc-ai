"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getAnalyses, type SavedAnalysis } from "@/lib/veridoc/analysesStore";
import { getAnalysisIDB } from "@/lib/veridoc/idbStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { FileText, Send, Loader2, Eye } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { createConsultationAction } from "@/app/actions/consultations";
import { useNEAR } from "@/context/NearContext";
import { getUsdtBalance, formatUsdtBalance, parseUsdtAmount, createTransferUsdtAction, signedDelegateToBase64, USDT_CONTRACT_ID } from "@/lib/near-usdt";
import { ESCROW_ACCOUNT_ID } from "@/lib/near-config";
import { encodeSignedDelegate } from "@near-js/transactions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type RequestSecondOpinionProps = {
  specialistAccount: string;
  specialistName: string;
  priceUsdt: number;
};

export function RequestSecondOpinion({
  specialistAccount,
  specialistName,
  priceUsdt,
}: RequestSecondOpinionProps) {
  const t = useTranslations("requestSecondOpinion");
  const tErrors = useTranslations("errors");
  const { user, login } = usePrivy();
  const { nearAccount, walletId } = useNEAR();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null);
  /** Hash of the USDT→escrow transaction (so user can verify in explorer; not the 2 NEAR fund tx) */
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);

  const handlePreviewIDB = async () => {
    if (!selectedId) return;
    setPreviewing(true);
    try {
      const data = await getAnalysisIDB(selectedId);
      if (data && data.pdfFile) {
        const url = URL.createObjectURL(data.pdfFile);
        window.open(url, "_blank");
      } else {
        alert(t("fileNotInIDB"));
      }
    } catch (err) {
      console.error("Preview IDB failed for ID:", selectedId, err);
      alert(`${t("errorPreview")} ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPreviewing(false);
    }
  };

  useEffect(() => {
    setAnalyses(getAnalyses());
  }, []);

  // Check USDT balance when wallet is available
  useEffect(() => {
    if (!walletId) {
      setUsdtBalance(null);
      return;
    }
    setCheckingBalance(true);
    getUsdtBalance(walletId)
      .then((raw) => setUsdtBalance(formatUsdtBalance(raw)))
      .catch(() => setUsdtBalance(null))
      .finally(() => setCheckingBalance(false));
  }, [walletId]);

  const handleSubmit = useCallback(async () => {
    if (!selectedId) return;

    if (!user) {
      login();
      return;
    }

    const patientAccount = walletId || user.wallet?.address;
    if (!patientAccount) {
      setError(t("noWallet"));
      return;
    }

    if (!nearAccount) {
      setError(t("nearNotReady"));
      return;
    }

    // Check USDT balance
    // if (usdtBalance === null) {
    //   setError("Checking balance...");
    //   setCheckingBalance(true);
    //   try {
    //     const raw = await getUsdtBalance(patientAccount);
    //     const formatted = formatUsdtBalance(raw);
    //     setUsdtBalance(formatted);
    //     const balanceNum = parseFloat(formatted.replace(/,/g, ""));
    //     if (balanceNum < priceUsdt) {
    //       setError(`Insufficient balance. You have ${formatted} USDT, need ${priceUsdt} USDT.`);
    //       setCheckingBalance(false);
    //       return;
    //     }
    //   } catch (err) {
    //     setError("Failed to check balance. Please try again.");
    //     setCheckingBalance(false);
    //     return;
    //   } finally {
    //     setCheckingBalance(false);
    //   }
    // } else {
    //   const balanceNum = parseFloat(usdtBalance.replace(/,/g, ""));
    //   if (balanceNum < priceUsdt) {
    //     setError(`Insufficient balance. You have ${usdtBalance} USDT, need ${priceUsdt} USDT.`);
    //     return;
    //   }
    // }

    const selectedAnalysis = analyses.find((a) => a.id === selectedId);
    if (!selectedAnalysis) return;

    let documentUrl = selectedAnalysis.pdfUrl;

    setSubmitting(true);
    setError(null);

    // Si no tiene URL de Cloudinary, intentamos subir el archivo local de IndexedDB
    if (!documentUrl) {
      try {
        const idbData = await getAnalysisIDB(selectedId);
        if (idbData?.pdfFile) {
          const uint8 = new Uint8Array(await idbData.pdfFile.arrayBuffer());
          const uploadedUrl = await uploadToCloudinary(
            uint8,
            idbData.labFileName,
            idbData.pdfFile.type || "application/pdf"
          );
          if (uploadedUrl) {
            documentUrl = uploadedUrl;
          }
        }
      } catch (err) {
        console.error("Marketplace: Error retrieving file from IndexedDB", err);
      }
    }

    if (!documentUrl) {
      setError(t("couldNotGetDocument"));
      setSubmitting(false);
      return;
    }

    try {
      // Step 1: Create consultation first to get consultationId
      const consultationResult = await createConsultationAction({
        patientAccount,
        specialistAccount,
        specialistName,
        documentUrl,
        analysisCommentsAI: selectedAnalysis.report.summary,
      });

      const createdId = consultationResult.data?._id ?? consultationResult.data?.id;
      if (!consultationResult.success || !createdId) {
        setError(consultationResult.error || t("couldNotCreateConsultation"));
        setSubmitting(false);
        return;
      }

      const consultationId = createdId;

      // Step 2: Meta-transaction (SignedDelegate) for escrow deposit — same API as withdraw in profile
      const amountRaw = parseUsdtAmount(priceUsdt.toString());
      const transferAction = createTransferUsdtAction(amountRaw, ESCROW_ACCOUNT_ID, consultationId);

      const signedDelegate = await nearAccount.signedDelegate({
        actions: [transferAction],
        blockHeightTtl: 100,
        receiverId: USDT_CONTRACT_ID,
      });

      const encoded = encodeSignedDelegate(signedDelegate);
      const signedDelegateBase64 = signedDelegateToBase64(encoded);

      // Step 4: Send to relay-escrow-deposit (meta-transaction)
      // Use absolute URL so redirects (e.g. on Vercel) don't turn POST into GET
      const relayUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/near/relay-escrow-deposit`
          : "/api/near/relay-escrow-deposit";
      const relayRes = await fetch(relayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedDelegateBase64,
        }),
      });

      const relayResult = await relayRes.json();
      if (!relayRes.ok || !relayResult.success || !relayResult.txHash) {
        const msg = relayResult.errorCode
          ? tErrors(relayResult.errorCode as "transactionFailed" | "paymentNotVerified")
          : [relayResult.error, relayResult.details].filter(Boolean).join(" — ") || t("paymentProcessFailed");
        setError(msg);
        setSubmitting(false);
        return;
      }

      // Step 5: Confirm payment with backend (optional; backend may not have the endpoint yet)
      const confirmRes = await fetch("/api/consultations/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId,
          txHash: relayResult.txHash,
          amountRaw,
        }),
      });
      const confirmResult = await confirmRes.json().catch(() => ({}));

      const confirmOk = confirmRes.ok && confirmResult.success;
      const backendNotFound =
        confirmRes.status === 404 ||
        (confirmResult.error && String(confirmResult.error).toLowerCase().includes("route not found"));

      if (!confirmOk && !backendNotFound) {
        setError(confirmResult.errorCode ? tErrors(confirmResult.errorCode as "paymentNotVerified" | "transactionFailed") : confirmResult.error || confirmResult.details || t("paymentProcessedConfirmFailed"));
        setSubmitting(false);
        return;
      }

      // Success: USDT was sent to escrow. If backend doesn't have confirm-payment yet, we still show success.
      setPaymentTxHash(relayResult.txHash);
      setSubmitted(true);
      if (backendNotFound) {
        setError(null);
        // Optional: you could set a non-blocking warning state here to show "Backend sin endpoint de confirmación"
      }
    } catch (e) {
      console.error("Error in handleSubmit:", e);
      setError(e instanceof Error ? e.message : t("unexpectedError"));
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedId,
    user,
    login,
    analyses,
    specialistAccount,
    specialistName,
    nearAccount,
    walletId,
    usdtBalance,
    priceUsdt,
    t,
    tErrors,
  ]);

  if (analyses.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h3 className="text-sm font-semibold text-slate-900">
          {t("noAnalysesTitle")}
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          {t("noAnalysesDesc")}
        </p>
        <Link
          href="/veridoc"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          {t("goToWizard")}
        </Link>
        <Link
          href="/analisis"
          className="ml-3 inline-flex text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          {t("viewMyAnalyses")}
        </Link>
      </div>
    );
  }

  if (submitted) {
    const explorerBase = typeof window !== "undefined" && (process.env.NEXT_PUBLIC_NEAR_NETWORK === "testnet")
      ? "https://nearblocks.io/txns"
      : "https://nearblocks.io/txns";
    return (
      <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 text-emerald-800">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Send className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{t("requestSent")}</h3>
            <p className="mt-1 text-sm text-emerald-700">
              {t("requestSentDesc", { specialistName, priceUsdt })}
            </p>
            {paymentTxHash && (
              <p className="mt-3 text-xs text-emerald-600">
                {t("paymentTxLabel")}{" "}
                <a
                  href={`${explorerBase}/${paymentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline break-all"
                >
                  {paymentTxHash.slice(0, 12)}…{paymentTxHash.slice(-8)}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
      <h3 className="text-sm font-semibold text-slate-900">
        {t("title")}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {t("sendAnalysesDesc", { specialistName })} <strong>{priceUsdt} USDT</strong>.
      </p>
      {walletId && (
        <div className="mt-2 text-xs text-slate-600">
          {checkingBalance ? (
            <span>{t("checkingBalance")}</span>
          ) : usdtBalance !== null ? (
            <span>
              {t("yourBalance")} <strong>{usdtBalance} USDT</strong>
              {parseFloat(usdtBalance.replace(/,/g, "")) < priceUsdt && (
                <span className="ml-2 text-rose-600">{t("insufficient")}</span>
              )}
            </span>
          ) : (
            <span className="text-amber-600">{t("couldNotVerifyBalance")}</span>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {analyses.map((a) => (
          <label
            key={a.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selectedId === a.id
              ? "border-teal-300 bg-teal-50/50 ring-1 ring-teal-200/60"
              : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
              }`}
          >
            <input
              type="radio"
              name="analysis"
              value={a.id}
              checked={selectedId === a.id}
              onChange={() => setSelectedId(a.id)}
              className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <FileText className="h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {a.labFileName}
              </p>
              <p className="text-xs text-slate-500">{formatDate(a.createdAt)}</p>
              {/* Botón de test para IndexedDB */}
              {selectedId === a.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePreviewIDB();
                  }}
                  disabled={previewing}
                  className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 text-[10px] font-bold uppercase tracking-wider text-teal-700 transition hover:bg-teal-100 disabled:opacity-50"
                  title={t("previewIDB")}
                >
                  {previewing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  Preview IDB
                </button>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedId || submitting}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("sending")}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t("payAndRequest", { priceUsdt })}
            </>
          )}
        </button>
        <Link
          href="/analisis"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          {t("viewAllMyAnalyses")}
        </Link>
      </div>
      {error && (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-600">
          {error}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        {t("paymentNote")}
      </p>
    </div>
  );
}
