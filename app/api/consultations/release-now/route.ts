import { NextRequest, NextResponse } from "next/server";
import { Account } from "@near-js/accounts";
import { JsonRpcProvider } from "@near-js/providers";
import { KeyPairSigner } from "@near-js/signers";
import type { KeyPairString } from "@near-js/crypto";
import {
  NEAR_RPC_URL,
  ESCROW_ACCOUNT_ID,
  PLATFORM_FEE_ACCOUNT_ID,
  isValidNearAccountId,
} from "@/lib/near-config";
import {
  USDT_CONTRACT_ID,
  createTransferUsdtAction,
  hasStorageDeposit,
  createStorageDepositAction,
} from "@/lib/near-usdt";
import { splitEscrowAmount } from "@/lib/escrow";

/**
 * POST /api/consultations/release-now
 * Body: { consultationId: string, amountRaw: string, specialistAccount: string }
 * Header: x-cron-secret (or Authorization: Bearer <CRON_SECRET>)
 *
 * Mock/short path: releases escrow for a single consultation immediately
 * (no 24h wait). Used when the specialist submits their diagnosis.
 */
export async function POST(request: NextRequest) {
  const secret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    consultationId?: string;
    amountRaw?: string;
    specialistAccount?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { consultationId, amountRaw, specialistAccount } = body;
  if (!consultationId || !amountRaw || !specialistAccount) {
    return NextResponse.json(
      {
        error: "Missing required fields: consultationId, amountRaw, specialistAccount",
      },
      { status: 400 }
    );
  }

  if (!isValidNearAccountId(specialistAccount)) {
    return NextResponse.json(
      {
        error: `specialistAccount is not a valid NEAR account (use specialist's nearAddress)`,
      },
      { status: 400 }
    );
  }

  const escrowPrivateKey = process.env.ESCROW_PRIVATE_KEY;
  if (!escrowPrivateKey) {
    return NextResponse.json(
      { error: "ESCROW_PRIVATE_KEY not set" },
      { status: 503 }
    );
  }

  const baseUrl = process.env.SPECIALIST_VERIFICATION_API_URL;

  try {
    const { specialistAmountRaw: finalSpecialistAmount, platformFeeRaw: finalPlatformFee } =
      splitEscrowAmount(amountRaw);

    const signer = KeyPairSigner.fromSecretKey(escrowPrivateKey as KeyPairString);
    const provider = new JsonRpcProvider({ url: NEAR_RPC_URL });
    const escrowAccount = new Account(ESCROW_ACCOUNT_ID, provider, signer);

    // Ensure specialist has USDT storage (NEP-145)
    const hasStorage = await hasStorageDeposit(specialistAccount);
    if (!hasStorage) {
      await escrowAccount.signAndSendTransaction({
        receiverId: USDT_CONTRACT_ID,
        actions: [createStorageDepositAction(specialistAccount)],
      });
    }

    // 85% to specialist
    const specialistTx = await escrowAccount.signAndSendTransaction({
      receiverId: USDT_CONTRACT_ID,
      actions: [createTransferUsdtAction(finalSpecialistAmount, specialistAccount)],
    });
    const specialistTxHash =
      typeof specialistTx?.transaction_outcome?.id === "string"
        ? specialistTx.transaction_outcome.id
        : undefined;

    // 15% to platform
    const platformTx = await escrowAccount.signAndSendTransaction({
      receiverId: USDT_CONTRACT_ID,
      actions: [createTransferUsdtAction(finalPlatformFee, PLATFORM_FEE_ACCOUNT_ID)],
    });
    const platformTxHash =
      typeof platformTx?.transaction_outcome?.id === "string"
        ? platformTx.transaction_outcome.id
        : undefined;

    // Optionally notify backend (may 404 if not implemented)
    if (baseUrl) {
      const updateUrl = `${baseUrl.replace(/\/$/, "")}/api/consultations/${consultationId}/release`;
      await fetch(updateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releasedAt: new Date().toISOString(),
          releaseTxHash: specialistTxHash || platformTxHash,
          specialistTxHash,
          platformTxHash,
        }),
        cache: "no-store",
      });
    }

    return NextResponse.json({
      success: true,
      consultationId,
      txHash: specialistTxHash,
      specialistTxHash,
      platformTxHash,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[consultations/release-now]", message, e);
    return NextResponse.json(
      { error: "Release failed", details: message },
      { status: 500 }
    );
  }
}
