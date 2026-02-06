"use client";

import { useState } from "react";
import { useWallet } from "@/components/providers/WalletProvider";

type PaymentMethod = "NEAR" | "ETH" | "USDC (Base)";

type DepositIntentProps = {
  onDepositSuccess: (amount: string) => void;
};

// NEP-413 Intent structure
type NEP413Intent = {
  standard: "NEP-413";
  message: string;
  nonce: number[];
  recipient: string;
};

const TREASURY_ACCOUNT = "veridoc.testnet";

export const DepositIntent = ({ onDepositSuccess }: DepositIntentProps) => {
  const { accountId, signMessage, modal } = useWallet();
  const [selectedCurrency, setSelectedCurrency] = useState<PaymentMethod>("USDC (Base)");
  const [destinationAmount, setDestinationAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Conversion rates (in production, these would come from an oracle)
  const conversionRates: Record<PaymentMethod, number> = {
    NEAR: 2500, // 1 NEAR = 2500 USDT
    ETH: 2500, // 1 ETH = 2500 USDT
    "USDC (Base)": 1, // 1 USDC = 1 USDT
  };

  const handleConnectWallet = () => {
    if (modal) {
      modal.show();
    }
  };

  const handleDeposit = async () => {
    if (!accountId) {
      handleConnectWallet();
      return;
    }

    if (!destinationAmount || parseFloat(destinationAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);
    setSuccessMessage(null);
    setError(null);

    try {
      // Step 1: Construct NEP-413 Intent JSON
      const nonceBytes = new Uint8Array(32);
      crypto.getRandomValues(nonceBytes);

      const intent: NEP413Intent = {
        standard: "NEP-413",
        message: `Deposit ${destinationAmount} USDT to Veridoc via Intents`,
        nonce: Array.from(nonceBytes),
        recipient: TREASURY_ACCOUNT,
      };

      // Step 2: Sign the Intent
      const intentJson = JSON.stringify(intent);
      const signedMessage = await signMessage({
        message: intentJson,
        recipient: TREASURY_ACCOUNT,
        nonce: nonceBytes,
      });

      if (!signedMessage || !signedMessage.signature) {
        throw new Error("Signature was cancelled or failed");
      }

      // Step 3: Relay the Intent to the API
      const relayResponse = await fetch("/api/intents/relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: accountId,
          message: intentJson, // The signed JSON string
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey,
        }),
      });

      if (!relayResponse.ok) {
        const errorData = await relayResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to relay Intent");
      }

      const result = await relayResponse.json();

      // Step 4: Handle success
      if (!result.success) {
        throw new Error(result.error || "Intent relay failed");
      }

      setIsProcessing(false);
      setSuccessMessage(
        `✅ Intent Executed: ${destinationAmount} USDT deposited successfully. New balance: ${result.newBalance.toFixed(2)} USDT`
      );

      // Update parent component with the actual new balance from server
      onDepositSuccess(result.newBalance.toString());

      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        setDestinationAmount("");
      }, 5000);
    } catch (err) {
      console.error("Error processing deposit:", err);
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : "An error occurred while processing the deposit";
      setError(errorMessage);
    }
  };

  return (
    <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm backdrop-blur sm:p-8">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Deposit with Chain Abstraction</h2>

      {accountId && (
        <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">
          <p>
            Connected as: <span className="font-semibold">{accountId}</span>
          </p>
        </div>
      )}

      <div className="grid gap-6">
        {/* Source Currency Selector */}
        <div>
          <label htmlFor="source-currency" className="mb-2 block text-sm font-medium text-slate-700">
            Source Currency
          </label>
          <select
            id="source-currency"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as PaymentMethod)}
            disabled={isProcessing}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-medium text-slate-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="NEAR">NEAR</option>
            <option value="ETH">ETH</option>
            <option value="USDC (Base)">USDC (Base)</option>
          </select>
          <p className="mt-2 text-xs text-slate-500">
            Pay with {selectedCurrency}, receive USDT on NEAR
          </p>
        </div>

        {/* Destination Amount Input */}
        <div>
          <label htmlFor="destination-amount" className="mb-2 block text-sm font-medium text-slate-700">
            Amount to Deposit (USDT)
          </label>
          <div className="relative">
            <input
              id="destination-amount"
              type="number"
              step="0.01"
              min="0"
              value={destinationAmount}
              onChange={(e) => {
                setDestinationAmount(e.target.value);
                setError(null);
              }}
              placeholder="50.00"
              disabled={isProcessing}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
              USDT
            </span>
          </div>
          {destinationAmount && parseFloat(destinationAmount) > 0 && (
            <p className="mt-2 text-xs text-slate-600">
              ≈{" "}
              {(
                parseFloat(destinationAmount) / conversionRates[selectedCurrency]
              ).toFixed(4)}{" "}
              {selectedCurrency} required
            </p>
          )}
        </div>

        {/* Deposit Button */}
        <button
          type="button"
          onClick={handleDeposit}
          disabled={
            isProcessing ||
            Boolean(!accountId && !destinationAmount) ||
            Boolean(accountId && (!destinationAmount || parseFloat(destinationAmount) <= 0))
          }
          className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-600 to-sky-600 px-6 text-base font-semibold text-white shadow-lg transition hover:from-teal-700 hover:to-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Processing Intent...
            </>
          ) : accountId ? (
            "Deposit"
          ) : (
            "Connect Meteor Wallet"
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {/* Texto de Powered by */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Powered by{" "}
            <span className="font-semibold text-slate-700">NEAR Intents</span> &{" "}
            <span className="font-semibold text-slate-700">Chain Abstraction</span>
          </p>
        </div>
      </div>
    </div>
  );
};
