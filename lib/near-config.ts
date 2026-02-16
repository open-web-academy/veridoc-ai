/**
 * NEAR and NEAR Intents configuration.
 * Verifier: https://docs.near-intents.org/
 * USDT on NEAR: usdt.tether-token.near (NEP-141)
 * Chain support: https://docs.near-intents.org/near-intents/chain-address-support
 */

export const NEAR_NETWORK = (process.env.NEXT_PUBLIC_NEAR_NETWORK ?? "mainnet") as "mainnet" | "testnet";

/** Min NEAR to fund an implicit account so it exists on-chain (~storage for one key). */
export const MIN_NEAR_TO_CREATE_IMPLICIT = "0.002";

/** Testnet faucet / funding page. Mainnet: user must send from exchange or another wallet. */
export const NEAR_TESTNET_FAUCET_URL = "https://wallet.testnet.near.org/create";

export const NEAR_RPC_URL =
  NEAR_NETWORK === "mainnet"
    ? "https://rpc.mainnet.near.org"
    : "https://rpc.testnet.near.org";

/** NEAR Intents Verifier contract (holds deposits, mt_balance_of, ft_withdraw). */
export const VERIFIER_CONTRACT_ID = "intents.near";

/** Relayer account that pays gas for meta-transactions (e.g. USDT withdraw). */
export const RELAYER_ACCOUNT_ID = process.env.NEXT_PUBLIC_NEAR_RELAYER_ACCOUNT_ID ?? "veridoc.near";

/** Escrow account that receives USDT payments for second opinions. */
export const ESCROW_ACCOUNT_ID = process.env.ESCROW_ACCOUNT_ID ?? process.env.NEXT_PUBLIC_ESCROW_ACCOUNT_ID ?? "escrow.veridoc.near";

/** Platform account that receives the 15% fee. */
export const PLATFORM_FEE_ACCOUNT_ID = process.env.PLATFORM_FEE_ACCOUNT_ID ?? "veridoc.near";

/**
 * Valid NEAR account ID: 2–64 chars.
 * - Implicit: exactly 64 lowercase hex (with or without 0x prefix).
 * - Named: segments of 2–64 chars from [a-z0-9_-], separated by dots (e.g. alice.near).
 * Returns the normalized form (lowercase, 0x stripped for implicit) for use in contract calls.
 */
export function normalizeNearAccountId(input: string): string {
  const s = input.trim();
  if (s.length === 0) return "";
  // Implicit: allow 0x + 64 hex or 64 hex; normalize to 64 lowercase hex
  if (s.startsWith("0x") && s.length === 66 && /^0x[a-fA-F0-9]{64}$/.test(s)) {
    return s.slice(2).toLowerCase();
  }
  if (s.length === 64 && /^[a-fA-F0-9]{64}$/.test(s)) {
    return s.toLowerCase();
  }
  // Named: return lowercase (NEAR allows lowercase for named accounts)
  if (s.length >= 2 && s.length <= 64 && /^[a-zA-Z0-9._-]+$/.test(s)) {
    const parts = s.split(".");
    const valid = parts.every((p) => p.length >= 2 && p.length <= 64 && /^[a-z0-9_-]+$/i.test(p));
    if (valid) return s.toLowerCase();
  }
  return "";
}

/** Returns true if the string is a valid NEAR account ID (implicit or named). */
export function isValidNearAccountId(input: string): boolean {
  return normalizeNearAccountId(input).length > 0;
}

/** USDT on NEAR mainnet (NEP-141). Token ID in Verifier: nep141:usdt.tether-token.near */
export const USDT_CONTRACT_ID = "usdt.tether-token.near";

export const USDT_TOKEN_ID_IN_VERIFIER = "nep141:usdt.tether-token.near" as const;

/** Redes que NEAR Intents acepta para depositar USDT (y otros activos). */
export type DepositNetworkId =
  | "near"
  | "ethereum"
  | "arbitrum"
  | "aurora"
  | "base"
  | "bnb"
  | "polygon"
  | "optimism"
  | "gnosis"
  | "solana"
  | "ton"
  | "tron";

export interface DepositNetwork {
  id: DepositNetworkId;
  name: string;
  /** URL del logo de la cadena. */
  logoUrl: string;
  /** Si tenemos flujo de depósito in-app (solo NEAR por ahora). */
  availableInApp: boolean;
  /** Enlace al depósito oficial de NEAR Intents cuando no está disponible in-app. */
  externalDepositUrl: string;
  /** Dirección / contrato al que enviar USDT en esta red (Treasury NEAR Intents). */
  depositAddress: string;
}

const NEAR_INTENTS_DEPOSIT_BASE = "https://app.near-intents.org/deposit";

/** Treasury NEAR Intents para EVM (Ethereum, Arbitrum, Aurora, Base, BNB, Polygon, Optimism, Gnosis, etc.). */
const EVM_TREASURY = "0x2CfF890f0378a11913B6129B2E97417a2c302680";

/** Logos: CoinGecko / CDN públicos por cadena. */
const LOGOS = {
  solana: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  ethereum: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  near: "https://assets.coingecko.com/coins/images/10365/small/near.jpg",
  arbitrum: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  base: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  bnb: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  polygon: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
  optimism: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  aurora: "https://assets.coingecko.com/coins/images/20582/small/aurora.jpeg",
  gnosis: "https://assets.coingecko.com/coins/images/662/small/logo_square_simple_300px.png",
  ton: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  tron: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
} as const;

/** Orden: Solana, Ethereum, luego NEAR (in-app), luego cadenas de mayor uso (Arbitrum, Base, BNB, Polygon, etc.). */
export const DEPOSIT_NETWORKS: DepositNetwork[] = [
  {
    id: "solana",
    name: "Solana",
    logoUrl: LOGOS.solana,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: "HWjmoUNYckccg9Qrwi43JTzBcGcM1nbdAtATf9GXmz16",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    logoUrl: LOGOS.ethereum,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: EVM_TREASURY,
  },
  {
    id: "near",
    name: "NEAR",
    logoUrl: LOGOS.near,
    availableInApp: true,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: VERIFIER_CONTRACT_ID,
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    logoUrl: LOGOS.arbitrum,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: EVM_TREASURY,
  },
  {
    id: "base",
    name: "Base",
    logoUrl: LOGOS.base,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: EVM_TREASURY,
  },
  {
    id: "bnb",
    name: "BNB Chain",
    logoUrl: LOGOS.bnb,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: EVM_TREASURY,
  },
  {
    id: "polygon",
    name: "Polygon",
    logoUrl: LOGOS.polygon,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: EVM_TREASURY,
  },
  {
    id: "optimism",
    name: "Optimism",
    logoUrl: LOGOS.optimism,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: EVM_TREASURY,
  },
  {
    id: "aurora",
    name: "Aurora",
    logoUrl: LOGOS.aurora,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: EVM_TREASURY,
  },
  {
    id: "gnosis",
    name: "Gnosis",
    logoUrl: LOGOS.gnosis,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: EVM_TREASURY,
  },
  {
    id: "ton",
    name: "TON",
    logoUrl: LOGOS.ton,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: "UQAfoBd_f0pIvNpUPAkOguUrFWpGWV9TWBeZs_5TXE95_trZ",
  },
  {
    id: "tron",
    name: "TRON",
    logoUrl: LOGOS.tron,
    availableInApp: false,
    externalDepositUrl: NEAR_INTENTS_DEPOSIT_BASE,
    depositAddress: "TX5XiRXdyz7sdFwF5mnhT1QoGCpbkncpke",
  },
];
