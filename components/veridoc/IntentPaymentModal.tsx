"use client";

import { useState, useEffect } from "react";
import { createTokenTransferIntent, serializeIntent, type TokenTransferIntent } from "@/lib/intents/defuse";
import { useWallet } from "@/components/providers/WalletProvider";

type PaymentStep = "select" | "quoting" | "signing" | "relaying" | "success" | "error";

type SupportedToken = {
  symbol: "USDC" | "USDT" | "wNEAR";
  contractId: string;
  decimals: number;
  chain: string;
};

// Tokens soportados para el pago
const SUPPORTED_TOKENS: SupportedToken[] = [
  {
    symbol: "USDC",
    contractId: "usdc.fakes.testnet", // En producción: "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near"
    decimals: 6,
    chain: "NEAR",
  },
  {
    symbol: "USDT",
    contractId: "usdt.fakes.testnet", // En producción: "usdt.tether-token.near"
    decimals: 6,
    chain: "NEAR",
  },
  {
    symbol: "wNEAR",
    contractId: "wrap.testnet", // En producción: "wrap.near"
    decimals: 24,
    chain: "NEAR",
  },
];

// Monto fijo para Segunda Opinión
const SECOND_OPINION_AMOUNT_USD = 50;
const TREASURY_ACCOUNT = "treasury.veridoc.testnet"; // En producción: "treasury.veridoc.near"
const DESTINATION_TOKEN = "usdt.fakes.testnet"; // Token que recibimos (USDT en NEAR)

type IntentPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userAccountId?: string; // Account ID del usuario conectado
};

export const IntentPaymentModal = ({
  isOpen,
  onClose,
  onSuccess,
  userAccountId,
}: IntentPaymentModalProps) => {
  const { accountId: walletAccountId, signMessage: walletSignMessage, modal } = useWallet();
  const [step, setStep] = useState<PaymentStep>("select");
  const [selectedToken, setSelectedToken] = useState<SupportedToken | null>(null);
  const [intent, setIntent] = useState<TokenTransferIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<string | null>(null);

  // Use wallet accountId if userAccountId is not provided
  const accountId = userAccountId || walletAccountId;

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedToken(null);
      setIntent(null);
      setError(null);
      setQuoteAmount(null);
    }
  }, [isOpen]);

  // Validar que el usuario esté conectado
  if (!accountId && isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Conecta tu Wallet</h2>
          <p className="mb-6 text-sm text-slate-600">
            Necesitas conectar tu wallet NEAR para continuar con el pago.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (modal) {
                  modal.show();
                }
              }}
              className="flex-1 rounded-2xl bg-gradient-to-r from-teal-600 to-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-teal-700 hover:to-sky-700"
            >
              Conectar Wallet
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Paso 1: Seleccionar token
  const handleTokenSelect = async (token: SupportedToken) => {
    setSelectedToken(token);
    setStep("quoting");

    // Simular búsqueda de ruta con solvers
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Calcular monto necesario (simulado - en producción vendría del solver)
    // Para simplificar, asumimos 1:1 para USDC/USDT y conversión para wNEAR
    let amountNeeded: string;
    if (token.symbol === "wNEAR") {
      // Asumir 1 NEAR = $3 USD (simulado)
      const nearPrice = 3;
      const nearAmount = SECOND_OPINION_AMOUNT_USD / nearPrice;
      amountNeeded = (nearAmount * Math.pow(10, token.decimals)).toFixed(0);
    } else {
      // USDC/USDT: 1:1
      amountNeeded = (SECOND_OPINION_AMOUNT_USD * Math.pow(10, token.decimals)).toFixed(0);
    }

    setQuoteAmount(amountNeeded);

    // Crear el Intent
    try {
      const newIntent = createTokenTransferIntent({
        signerId: accountId,
        receiverId: TREASURY_ACCOUNT,
        tokenIn: token.contractId,
        amountIn: amountNeeded,
        tokenOut: DESTINATION_TOKEN,
        deadlineMinutes: 30,
        metadata: {
          appId: "veridoc",
          description: "Pago de Segunda Opinión Médica",
          service: "second_opinion",
          amountUSD: SECOND_OPINION_AMOUNT_USD,
        },
      });

      setIntent(newIntent);
      setStep("signing");
    } catch (err: any) {
      setError(err.message || "Error al crear el Intent");
      setStep("error");
    }
  };

  // Paso 3: Firmar el Intent
  const handleSignIntent = async () => {
    if (!intent || !selectedToken) return;

    setStep("signing");
    setError(null);

    try {
      // Verificar que el usuario tenga wallet conectada
      if (!accountId) {
        // Abrir modal de wallet si no está conectado
        if (modal) {
          modal.show();
          throw new Error("Por favor, conecta tu wallet NEAR primero");
        } else {
          throw new Error("Wallet no conectada. Por favor, conecta tu wallet NEAR.");
        }
      }

      // Serializar el Intent para firmar
      const intentMessage = serializeIntent(intent);

      // Crear nonce como Uint8Array (compatible con navegador)
      const nonceBytes = new TextEncoder().encode(intent.nonce);
      
      // Firmar el mensaje usando NEP-413 (signMessage)
      const signedMessage = await walletSignMessage({
        message: intentMessage,
        recipient: TREASURY_ACCOUNT,
        nonce: nonceBytes,
      });

      if (!signedMessage) {
        throw new Error("Firma cancelada por el usuario");
      }

      // Paso 4: Enviar a relay/solver
      setStep("relaying");

      // Enviar el Intent firmado al relay/solver
      const relayResponse = await fetch("/api/intents/relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: intent,
          signature: signedMessage,
        }),
      });

      if (!relayResponse.ok) {
        const errorData = await relayResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al enviar el Intent al solver");
      }

      // Éxito
      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Error al firmar/enviar Intent:", err);
      setError(err.message || "Error al procesar el pago");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Pagar Segunda Opinión</h2>
            <p className="mt-1 text-sm text-slate-600">$50 USD</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            disabled={step === "signing" || step === "relaying"}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Paso 1: Selección de Token */}
        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Selecciona el token con el que deseas pagar:</p>
            <div className="space-y-2">
              {SUPPORTED_TOKENS.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition hover:border-teal-400 hover:bg-teal-50/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{token.symbol}</p>
                      <p className="text-xs text-slate-500">{token.chain}</p>
                    </div>
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            <p className="pt-4 text-center text-xs text-slate-500">
              Pay with Intents (Gasless & Slippage protected)
            </p>
          </div>
        )}

        {/* Paso 2: Cotización */}
        {step === "quoting" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"></div>
              <p className="text-center font-medium text-slate-900">Buscando mejor ruta con Solvers...</p>
              <p className="mt-2 text-center text-sm text-slate-500">
                Optimizando conversión y gas fees
              </p>
            </div>
          </div>
        )}

        {/* Paso 3: Firma */}
        {step === "signing" && selectedToken && intent && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Pagarás:</span>
                <span className="font-semibold text-slate-900">
                  {quoteAmount && (
                    <>
                      {(parseFloat(quoteAmount) / Math.pow(10, selectedToken.decimals)).toFixed(6)}{" "}
                      {selectedToken.symbol}
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Recibirás:</span>
                <span className="font-semibold text-teal-600">$50.00 USDT</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"></div>
              <p className="text-center font-medium text-slate-900">Firmando Intent...</p>
              <p className="mt-2 text-center text-sm text-slate-500">
                Por favor, aprueba la firma en tu wallet
              </p>
            </div>

            <button
              onClick={handleSignIntent}
              className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-sky-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:from-teal-700 hover:to-sky-700"
            >
              Firmar y Enviar
            </button>
          </div>
        )}

        {/* Paso 4: Relay */}
        {step === "relaying" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"></div>
              <p className="text-center font-medium text-slate-900">Enviando Intent al Solver...</p>
              <p className="mt-2 text-center text-sm text-slate-500">
                El solver ejecutará la transacción por ti
              </p>
            </div>
          </div>
        )}

        {/* Éxito */}
        {step === "success" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-center text-lg font-semibold text-slate-900">¡Pago Exitoso!</p>
              <p className="mt-2 text-center text-sm text-slate-600">
                Tu Intent ha sido procesado correctamente
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {step === "error" && error && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="font-semibold text-rose-900">Error</p>
              <p className="mt-1 text-sm text-rose-700">{error}</p>
            </div>
            <button
              onClick={() => setStep("select")}
              className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
            >
              Intentar de Nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
