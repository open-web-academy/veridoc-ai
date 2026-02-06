/**
 * Utilidades para crear Intents compatibles con Defuse/NEAR Protocol
 * 
 * Los Intents permiten que los usuarios expresen su intención de realizar
 * una acción sin ejecutarla inmediatamente, permitiendo que solvers optimicen
 * la ejecución (ej: batching, routing, etc.)
 */

/**
 * Estructura de un Intent de transferencia de tokens
 */
export type TokenTransferIntent = {
  nonce: string;
  deadline: number; // Unix timestamp en milisegundos
  action: {
    type: "token_transfer";
    signerId: string;
    receiverId: string;
    tokenIn: string;
    amountIn: string;
    tokenOut: string;
    amountOut?: string; // Opcional, puede ser calculado por el solver
  };
  metadata?: {
    appId?: string;
    description?: string;
    [key: string]: unknown;
  };
};

/**
 * Opciones para crear un Intent de transferencia de tokens
 */
export type CreateIntentOptions = {
  signerId: string;
  receiverId: string;
  tokenIn: string;
  amountIn: string;
  tokenOut: string;
  amountOut?: string;
  deadlineMinutes?: number; // Tiempo de validez en minutos (default: 30)
  metadata?: Record<string, unknown>;
};

/**
 * Genera un nonce único para el Intent
 * Usa timestamp + número aleatorio para garantizar unicidad
 */
function generateNonce(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${timestamp}-${random}`;
}

/**
 * Calcula la deadline (tiempo límite) para el Intent
 * @param minutes - Minutos de validez (default: 30)
 * @returns Unix timestamp en milisegundos
 */
function calculateDeadline(minutes: number = 30): number {
  return Date.now() + minutes * 60 * 1000;
}

/**
 * Crea un Intent de transferencia de tokens compatible con Defuse/NEAR
 * 
 * Este Intent permite que un usuario exprese su intención de:
 * - Pagar con `tokenIn` (ej: ETH, USDC en Base)
 * - Recibir `tokenOut` (ej: USDT en NEAR)
 * - El solver se encarga de encontrar la mejor ruta y ejecutar la conversión
 * 
 * @param options - Opciones para crear el Intent
 * @returns Objeto Intent listo para ser firmado por la wallet
 * 
 * @example
 * ```typescript
 * const intent = createTokenTransferIntent({
 *   signerId: "user.near",
 *   receiverId: "treasury.veridoc.near",
 *   tokenIn: "usdc.base",
 *   amountIn: "1000000", // 1 USDC (6 decimals)
 *   tokenOut: "usdt.near",
 *   deadlineMinutes: 60
 * });
 * ```
 */
export function createTokenTransferIntent(
  options: CreateIntentOptions
): TokenTransferIntent {
  const {
    signerId,
    receiverId,
    tokenIn,
    amountIn,
    tokenOut,
    amountOut,
    deadlineMinutes = 30,
    metadata = {},
  } = options;

  // Validaciones básicas
  if (!signerId || !receiverId) {
    throw new Error("signerId y receiverId son requeridos");
  }

  if (!tokenIn || !tokenOut || !amountIn) {
    throw new Error("tokenIn, tokenOut y amountIn son requeridos");
  }

  if (parseFloat(amountIn) <= 0) {
    throw new Error("amountIn debe ser mayor a 0");
  }

  // Generar nonce único
  const nonce = generateNonce();

  // Calcular deadline
  const deadline = calculateDeadline(deadlineMinutes);

  // Construir el Intent
  const intent: TokenTransferIntent = {
    nonce,
    deadline,
    action: {
      type: "token_transfer",
      signerId,
      receiverId,
      tokenIn,
      amountIn,
      tokenOut,
      ...(amountOut && { amountOut }),
    },
    ...(Object.keys(metadata).length > 0 && { metadata }),
  };

  return intent;
}

/**
 * Valida que un Intent esté dentro de su tiempo de validez
 * @param intent - Intent a validar
 * @returns true si el Intent es válido, false si expiró
 */
export function isIntentValid(intent: TokenTransferIntent): boolean {
  return Date.now() < intent.deadline;
}

/**
 * Serializa un Intent a JSON string para firmar
 * @param intent - Intent a serializar
 * @returns JSON string listo para ser firmado
 */
export function serializeIntent(intent: TokenTransferIntent): string {
  return JSON.stringify(intent, null, 2);
}
