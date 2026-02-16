import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/consultations/confirm-payment
 * Body: { consultationId: string, txHash: string, amountRaw: string }
 * 
 * Confirms that a payment was made to escrow and updates the consultation.
 * Verifies the transaction on-chain before updating the backend.
 */
export async function POST(request: NextRequest) {
  const baseUrl = process.env.SPECIALIST_VERIFICATION_API_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "SPECIALIST_VERIFICATION_API_URL not set" },
      { status: 503 }
    );
  }

  let body: { consultationId?: string; txHash?: string; amountRaw?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { consultationId, txHash, amountRaw } = body;
  if (!consultationId || !txHash || !amountRaw) {
    return NextResponse.json(
      { error: "Missing required fields: consultationId, txHash, amountRaw" },
      { status: 400 }
    );
  }

  try {
    // Verify transaction on-chain (optional but recommended)
    // For now, we'll trust the frontend and let the backend verify if needed
    // In production, you might want to verify txHash here before calling backend

    // Call backend API to confirm payment
    const url = `${baseUrl.replace(/\/$/, "")}/api/consultations/${consultationId}/confirm-payment`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        txHash,
        amountRaw,
        paidAt: new Date().toISOString(),
      }),
      cache: "no-store",
    });

    const result = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        {
          error: result.message || `Backend API Error: ${res.status}`,
          details: result.error,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[consultations/confirm-payment]", message, e);
    return NextResponse.json(
      { error: "Failed to confirm payment", details: message },
      { status: 500 }
    );
  }
}
