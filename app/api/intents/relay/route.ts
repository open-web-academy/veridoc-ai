import { NextRequest, NextResponse } from "next/server";
import { utils } from "near-api-js";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

/**
 * API Route para relaying y verificar Intents firmados
 * 
 * Este endpoint:
 * 1. Recibe accountId, message (JSON string), signature, y publicKey
 * 2. Verifica la firma usando near-api-js (KeyPair.verify)
 * 3. Parsea el mensaje para extraer el monto
 * 4. Actualiza el saldo del usuario en MongoDB
 * 5. Agrega un registro de transacción
 * 
 * Flujo: Usuario firma Intent -> Backend verifica -> Acredita saldo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, message, signature, publicKey } = body;

    // Validaciones básicas
    if (!accountId || !message || !signature || !publicKey) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, message, signature, and publicKey are required" },
        { status: 400 }
      );
    }

    console.log("📤 Intent received for relay:");
    console.log("   Account ID:", accountId);
    console.log("   Message:", message.substring(0, 100) + "...");

    // Step 1: Verify Signature using near-api-js
    try {
      // Parse the public key
      const publicKeyObj = utils.PublicKey.fromString(publicKey);

      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);

      // Convert signature to Uint8Array
      let signatureBytes: Uint8Array;
      if (typeof signature === "string") {
        // Handle base64 or hex string
        if (signature.startsWith("0x")) {
          // Hex string
          signatureBytes = Uint8Array.from(
            Buffer.from(signature.slice(2), "hex")
          );
        } else {
          // Assume base64
          signatureBytes = Uint8Array.from(
            Buffer.from(signature, "base64")
          );
        }
      } else if (Array.isArray(signature)) {
        signatureBytes = Uint8Array.from(signature);
      } else if (signature instanceof Uint8Array) {
        signatureBytes = signature;
      } else {
        return NextResponse.json(
          { error: "Invalid signature format" },
          { status: 400 }
        );
      }

      // Verify signature using PublicKey.verify
      const isValid = publicKeyObj.verify(messageBytes, signatureBytes);

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature: signature does not match message and public key" },
          { status: 401 }
        );
      }

      console.log("✅ Signature verified successfully");
    } catch (sigError) {
      console.error("❌ Error verifying signature:", sigError);
      const errorMessage = sigError instanceof Error ? sigError.message : "Unknown signature verification error";
      return NextResponse.json(
        { error: `Signature verification failed: ${errorMessage}` },
        { status: 401 }
      );
    }

    // Step 2: Parse Message to extract amount
    let parsedMessage: { standard?: string; message?: string; [key: string]: unknown };
    let depositAmount: number;

    try {
      parsedMessage = JSON.parse(message);

      // Extract amount from message
      // Message format: "Deposit [AMOUNT] USDT to Veridoc via Intents"
      const messageText = parsedMessage.message || "";
      const amountMatch = messageText.match(/Deposit\s+([\d.]+)\s+USDT/i);

      if (!amountMatch || !amountMatch[1]) {
        return NextResponse.json(
          { error: "Could not extract amount from message" },
          { status: 400 }
        );
      }

      depositAmount = parseFloat(amountMatch[1]);

      if (isNaN(depositAmount) || depositAmount <= 0) {
        return NextResponse.json(
          { error: "Invalid amount in message" },
          { status: 400 }
        );
      }

      console.log(`💰 Extracted deposit amount: ${depositAmount} USDT`);
    } catch (parseError) {
      console.error("❌ Error parsing message:", parseError);
      return NextResponse.json(
        { error: "Invalid message format: must be valid JSON" },
        { status: 400 }
      );
    }

    // Step 3: Database Update
    await dbConnect();

    // Find user by accountId (primary) or email (fallback)
    // In production, you might get email from session or link it to accountId
    // For now, we'll use accountId as the primary identifier
    let user = await User.findOne({ accountId });

    // If user doesn't exist, try to find by email (if provided in future)
    // For now, we create a new user with accountId
    if (!user) {
      // In production, you might get email from session/auth
      // Example: const email = await getEmailFromSession(accountId);
      // For now, we'll create user with just accountId
      user = await User.create({
        accountId,
        balance: 0,
        transactions: [],
        // email: email, // Uncomment when email is available from session
      });
      console.log(`👤 Created new user: ${accountId}`);
    }

    // Calculate amount in USDT with 6 decimals
    const usdtAmountWithDecimals = Math.floor(depositAmount * 1_000_000);

    // Get previous balance for logging
    const previousBalance = user.balance;

    // Increment balance
    user.balance += usdtAmountWithDecimals;

    // Add transaction record
    const transaction = {
      type: "intent_deposit",
      status: "completed",
      amount: depositAmount,
      metadata: {
        accountId,
        message: parsedMessage.message,
        timestamp: Date.now(),
      },
    };

    user.transactions.push(transaction);

    // Save user
    await user.save();

    const newBalance = user.balance / 1_000_000; // Convert back to USDT

    console.log(`💰 Balance updated for ${accountId}:`);
    console.log(`   Previous: ${(previousBalance / 1_000_000).toFixed(6)} USDT`);
    console.log(`   Added: ${depositAmount} USDT`);
    console.log(`   New: ${newBalance.toFixed(6)} USDT`);

    // Return success response
    return NextResponse.json({
      success: true,
      newBalance: newBalance,
      transaction: {
        type: transaction.type,
        status: transaction.status,
        amount: depositAmount,
      },
      accountId,
    });
  } catch (error) {
    console.error("❌ Error in Intent relay:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
