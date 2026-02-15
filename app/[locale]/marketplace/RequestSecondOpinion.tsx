"use client";

import { useCallback, useEffect, useState } from "react";
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

const PENDING_PAYMENT_KEY = "veridoc_pending_payment_confirm";
const PENDING_PAYMENT_MAX_AGE_MS = 30 * 60 * 1000; // 30 min

function savePendingPayment(consultationId: string, txHash: string, amountRaw: string) {
  try {
    localStorage.setItem(
      PENDING_PAYMENT_KEY,
      JSON.stringify({ consultationId, txHash, amountRaw, ts: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

function clearPendingPayment() {
  try {
    localStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    /* ignore */
  }
}

function getPendingPayment(): { consultationId: string; txHash: string; amountRaw: string } | null {
  try {
    const raw = localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { consultationId?: string; txHash?: string; amountRaw?: string; ts?: number };
    if (!data?.consultationId || !data?.txHash || !data?.amountRaw || !data?.ts) return null;
    if (Date.now() - data.ts > PENDING_PAYMENT_MAX_AGE_MS) {
      clearPendingPayment();
      return null;
    }
    return { consultationId: data.consultationId, txHash: data.txHash, amountRaw: data.amountRaw };
  } catch {
    return null;
  }
}

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
  /** True while we recover a pending payment after reload */
  const [recoveringPayment, setRecoveringPayment] = useState(false);

  const handlePreviewIDB = async () => {
    if (!selectedId) return;
    setPreviewing(true);
    try {
      const data = await getAnalysisIDB(selectedId);
      if (data && data.pdfFile) {
        const url = URL.createObjectURL(data.pdfFile);
        window.open(url, "_blank");
      } else {
        alert("El archivo no está en IndexedDB (tal vez se generó en otro dispositivo)");
      }
    } catch (err) {
      console.error("Preview IDB failed for ID:", selectedId, err);
      alert(`Error al previsualizar: ${err instanceof Error ? err.message : String(err)}`);
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

  // Recover pending payment if user reloaded after relay but before confirm-payment
  useEffect(() => {
    const pending = getPendingPayment();
    if (!pending) return;
    setRecoveringPayment(true);
    fetch("/api/consultations/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consultationId: pending.consultationId,
        txHash: pending.txHash,
        amountRaw: pending.amountRaw,
      }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((result) => {
        if (result?.success || result?.data) {
          clearPendingPayment();
          setPaymentTxHash(pending.txHash);
          setSubmitted(true);
        } else {
          setError(result?.error || result?.details || "No se pudo completar la confirmación del pago.");
        }
      })
      .catch(() => setError("Error al recuperar el pago pendiente. Revisa en Análisis si la consulta quedó pagada."))
      .finally(() => setRecoveringPayment(false));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedId) return;

    if (!user) {
      login();
      return;
    }

    const patientAccount = walletId || user.wallet?.address;
    if (!patientAccount) {
      setError("No wallet connected. Please connect your wallet.");
      return;
    }

    if (!nearAccount) {
      setError("NEAR wallet not ready. Please wait a moment and try again.");
      return;
    }

    // Check USDT balance before proceeding
    let balanceNum: number;
    if (usdtBalance === null) {
      setCheckingBalance(true);
      try {
        const raw = await getUsdtBalance(patientAccount);
        const formatted = formatUsdtBalance(raw);
        setUsdtBalance(formatted);
        balanceNum = parseFloat(formatted.replace(/,/g, ""));
      } catch (err) {
        setError("No se pudo verificar el saldo. Intenta de nuevo.");
        setCheckingBalance(false);
        return;
      } finally {
        setCheckingBalance(false);
      }
    } else {
      balanceNum = parseFloat(usdtBalance.replace(/,/g, ""));
    }
    if (balanceNum < priceUsdt) {
      setError(`Saldo insuficiente. Tienes ${usdtBalance ?? "0"} USDT y necesitas ${priceUsdt} USDT.`);
      return;
    }

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
      setError("No se pudo obtener el documento (PDF) para enviar. Por favor, intenta de nuevo o genera un nuevo análisis.");
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
        setError(consultationResult.error || "No se pudo crear la consulta. Intenta de nuevo.");
        setSubmitting(false);
        return;
      }

      const consultationId = createdId;

      // Step 2: Meta-transaction (SignedDelegate) for escrow deposit — same API as withdraw in profile.
      // NEP-141 ft_transfer accepts a memo: we send consultationId so the transfer is linked on-chain to this consultation (BD id).
      const amountRaw = parseUsdtAmount(priceUsdt.toString());
      const transferAction = createTransferUsdtAction(amountRaw, ESCROW_ACCOUNT_ID, consultationId);

      // TTL generoso para evitar DelegateActionExpired si hay latencia (crear consulta, firma, relay)
      const signedDelegate = await nearAccount.signedDelegate({
        actions: [transferAction],
        blockHeightTtl: 600, // ~10 min en NEAR (1 block ≈ 1s)
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
        const msg = [relayResult.error, relayResult.details].filter(Boolean).join(" — ") || "No se pudo procesar el pago. Intenta de nuevo.";
        setError(msg);
        setSubmitting(false);
        return;
      }

      // Persist so a reload before confirm-payment can recover
      savePendingPayment(consultationId, relayResult.txHash, amountRaw);

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
        setError(confirmResult.error || confirmResult.details || "Pago procesado pero no se pudo confirmar. Contacta soporte.");
        setSubmitting(false);
        return;
      }

      clearPendingPayment();
      // Success: USDT was sent to escrow. If backend doesn't have confirm-payment yet, we still show success.
      setPaymentTxHash(relayResult.txHash);
      setSubmitted(true);
      if (backendNotFound) {
        setError(null);
        // Optional: you could set a non-blocking warning state here to show "Backend sin endpoint de confirmación"
      }
    } catch (e) {
      console.error("Error in handleSubmit:", e);
      setError(e instanceof Error ? e.message : "An unexpected error occurred. Please try again.");
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
  ]);

  if (analyses.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h3 className="text-sm font-semibold text-slate-900">
          Enviar mis análisis y solicitar segunda opinión
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          No tienes análisis guardados. Completa el wizard en Veridoc para generar un análisis y luego podrás enviarlo a este especialista.
        </p>
        <Link
          href="/veridoc"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          Ir al wizard
        </Link>
        <Link
          href="/analisis"
          className="ml-3 inline-flex text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Ver mis análisis
        </Link>
      </div>
    );
  }

  if (recoveringPayment) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 text-teal-700">
          <Loader2 className="h-5 w-5 animate-spin shrink-0" />
          <p className="text-sm font-medium">Completando confirmación de pago (recarga recuperada)...</p>
        </div>
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
            <h3 className="font-semibold">Solicitud enviada y pago confirmado</h3>
            <p className="mt-1 text-sm text-emerald-700">
              Tu análisis ha sido enviado a {specialistName} y el pago de {priceUsdt} USDT ha sido depositado en escrow. Recibirás la segunda opinión en el plazo indicado (p. ej. 24–48 h). El pago se liberará al especialista 24 horas después de que entregue su dictamen.
            </p>
            {paymentTxHash && (
              <p className="mt-3 text-xs text-emerald-600">
                Transacción del pago USDT (no la de 2 NEAR de activación):{" "}
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
        Enviar mis análisis y solicitar segunda opinión
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Elige un análisis guardado para enviarlo a {specialistName}. El costo de la revisión es de <strong>{priceUsdt} USDT</strong>.
      </p>
      {walletId && (
        <div className="mt-2 text-xs text-slate-600">
          {checkingBalance ? (
            <span>Verificando saldo...</span>
          ) : usdtBalance !== null ? (
            <span>
              Tu saldo: <strong>{usdtBalance} USDT</strong>
              {parseFloat(usdtBalance.replace(/,/g, "")) < priceUsdt && (
                <span className="ml-2 text-rose-600">(insuficiente)</span>
              )}
            </span>
          ) : (
            <span className="text-amber-600">No se pudo verificar el saldo</span>
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
                  title="Ver PDF desde IndexedDB (Prueba local)"
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
          disabled={
            !selectedId ||
            submitting ||
            checkingBalance ||
            (usdtBalance !== null && parseFloat(usdtBalance.replace(/,/g, "")) < priceUsdt)
          }
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Pagar {priceUsdt} USDT y solicitar segunda opinión
            </>
          )}
        </button>
        <Link
          href="/analisis"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Ver todos mis análisis
        </Link>
      </div>
      {error && (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-600">
          {error}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        El pago se procesará mediante meta-transacción (gasless). El especialista recibirá el pago 24 horas después de entregar su dictamen.
      </p>
    </div>
  );
}
