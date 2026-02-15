/**
 * Verify a NEAR transaction on-chain (e.g. before confirming payment).
 * Uses RPC method "tx" to fetch transaction status.
 */

import { NEAR_RPC_URL } from "./near-config";

/**
 * Check that a transaction exists and executed successfully.
 * @param txHash Transaction hash (from signAndSendTransaction outcome).
 * @param senderAccountId Account that sent the transaction (e.g. relayer for relay txs).
 * @returns true if the tx exists and execution status is successful.
 */
export async function verifyNearTransaction(
  txHash: string,
  senderAccountId: string
): Promise<boolean> {
  if (!txHash?.trim() || !senderAccountId?.trim()) return false;
  try {
    const res = await fetch(NEAR_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "tx-verify",
        method: "tx",
        params: [txHash.trim(), senderAccountId.trim()],
      }),
      cache: "no-store",
    });
    const data = await res.json();
    if (data.error) return false;
    const outcome = data.result?.transaction_outcome?.outcome;
    const status = outcome?.status;
    if (!status) return false;
    if (typeof status === "object" && "Failure" in status) return false;
    const receipts = data.result?.receipts_outcome ?? [];
    for (const r of receipts) {
      const s = r?.outcome?.status;
      if (typeof s === "object" && s !== null && "Failure" in s) return false;
    }
    return typeof status === "object" && ("SuccessValue" in status || "SuccessReceiptId" in status);
  } catch {
    return false;
  }
}
