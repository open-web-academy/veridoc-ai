# Technologies and APIs — Veridoc

Overview of technologies and APIs used in Veridoc, **with emphasis on NEAR ecosystem**.

---

## For stakeholders & non-technical readers (resume-style)

Short, benefit-focused overview of the main technologies:

- **NEAR AI — Private inference**  
  Medical-grade AI analyzes blood test results without storing or reselling raw data. Users get clear insights (summary, key items, next steps) while keeping diagnostics under their control.

- **Privy — Web2 experience for Web3**  
  Users sign in with email, social login, or passkey—no seed phrases or external wallet required. A NEAR wallet is created in the background so anyone can hold and use USDT without knowing they’re “on blockchain.”

- **NEAR Accounts — USDT balances & payments**  
  Each user has a NEAR account that holds USDT. Balances and payments for second opinions run on-chain, with **meta-transactions** so the platform pays gas: users only approve the payment, no NEAR needed for fees.

- **Meta-transactions (NEP-366)**  
  Users sign a single approval; a relayer submits the transaction and pays gas. Enables seamless withdraw and escrow deposits (pay specialist in USDT) without exposing users to gas or extra steps.

- **NEAR Intents — Multi-chain deposits & withdrawals**  
  Users can fund their USDT balance from multiple chains (NEAR, Ethereum, Arbitrum, Solana, etc.) and withdraw to their preferred network, all from one account.

- **Escrow & secure payouts**  
  Second-opinion payments go to an escrow account. After the specialist delivers, funds are split automatically (e.g. 85% specialist, 15% platform), with no manual release.

- **Next.js & modern web stack**  
  Fast, responsive web app with server-side logic for analysis and API routes for relay and cron (e.g. escrow release).

---

## NEAR technologies (primary)

### 1. **NEAR AI (private inference)**

- **What:** Cloud API for private / zero-knowledge-style inference. Used to analyze blood test content (markdown) and return structured medical insights (summary, key items, next steps, questions) without storing raw diagnostics on Veridoc servers.
- **API:** `https://cloud-api.near.ai/v1/chat/completions` (OpenAI-compatible chat completions).
- **Auth:** `NEAR_AI_API_KEY` (Bearer token).
- **Model:** `openai/gpt-oss-120b`.
- **Usage:** Server action `analyzeWithNearAI()` in `app/actions/analyze-near.ts`; optional path in `app/actions/analyze-document.ts` (alternate URL `api.near.ai`).
- **Docs:** [NEAR AI](https://near.ai) / cloud API.

---

### 2. **NEAR Protocol — accounts, RPC, transactions**

- **Libraries:** `@near-js/accounts`, `@near-js/providers`, `@near-js/transactions`, `@near-js/signers`, `@near-js/crypto`.
- **RPC:** `NEAR_RPC_URL` — mainnet `https://rpc.mainnet.near.org` or testnet `https://rpc.testnet.near.org` (from `lib/near-config.ts`).
- **Usage:**
  - **Accounts:** Each user has a NEAR account (implicit or named) used as wallet and identity. Balances (NEAR, USDT) and transfers are on-chain.
  - **Signing:** Via Privy-created NEAR wallet + custom `NearPrivySigner` (`lib/near-privy-signer.ts`) implementing NEAR `Signer`; used with `Account` for signing transactions and **NEP-366 Signed Delegates** (meta-transactions).
  - **Context:** `NearContext` / `NearProvider` (`context/NearContext.tsx`) expose `walletId`, `nearAccount`, `provider`, and helpers (create wallet, refresh existence, funding state).

---

### 3. **USDT on NEAR (NEP-141 / NEP-145)**

- **Contract:** `usdt.tether-token.near` (NEP-141 fungible token).
- **Config:** `USDT_CONTRACT_ID`, `USDT_DECIMALS` (6) in `lib/near-config.ts` and `lib/near-usdt.ts`.
- **Usage:**
  - **Balance:** `getUsdtBalance(accountId)` — view `ft_balance_of` via RPC.
  - **Transfers:** `createTransferUsdtAction(amountRaw, receiverId, memo)` for `ft_transfer`; used in profile (withdraw) and marketplace (pay specialist via escrow).
  - **Storage:** NEP-145 `storage_deposit` so an account can receive USDT; helpers `hasStorageDeposit`, `createStorageDepositAction` in `lib/near-usdt.ts`.
- **Docs:** NEP-141 (Fungible Token), NEP-145 (storage).

---

### 4. **NEP-366 Signed Delegate (meta-transactions)**

- **What:** User signs a **DelegateAction** (receiver, actions, nonce, etc.); a relayer submits the transaction and pays gas. User does not need NEAR for gas.
- **Usage:**
  - **Withdraw USDT:** User signs `ft_transfer` to destination NEAR account → frontend sends base64-encoded `SignedDelegate` to `POST /api/near/relay-withdraw` → relayer submits and pays gas.
  - **Escrow deposit:** User signs `ft_transfer` to escrow account (with memo e.g. `consultation_id`) → `POST /api/near/relay-escrow-deposit` → relayer submits; backend ensures delegate receiver is `usdt.tether-token.near` and destination is whitelisted escrow.
- **Encoding:** `encodeSignedDelegate` / decode + `signedDelegateToBase64`; Borsh schema from `@near-js/transactions`.
- **Docs:** [NEP-366](https://github.com/near/NEPs/blob/master/neps/nep-0366.md) (Delegate Action).

---

### 5. **NEAR Intents (deposits & cross-chain withdraw)**

- **Verifier contract:** `intents.near` — holds deposits, `mt_balance_of`, and supports `ft_withdraw` for cross-chain.
- **Token ID in Verifier:** `nep141:usdt.tether-token.near`.
- **Deposits:** Users can fund USDT via NEAR or other chains; config and deposit URLs in `lib/near-config.ts` (`DEPOSIT_NETWORKS`, `externalDepositUrl`, `depositAddress`). In-app flow is NEAR-focused; other chains link to `https://app.near-intents.org/deposit`.
- **Cross-chain withdraw:** Implemented with **Defuse (NEAR Intents) SDK** — see below.
- **Docs:** [NEAR Intents](https://docs.near-intents.org/), [Chain support](https://docs.near-intents.org/near-intents/chain-address-support).

---

### 6. **Defuse Protocol — NEAR Intents SDK**

- **Package:** `@defuse-protocol/intents-sdk`.
- **Purpose:** Create and process **withdraw intents** so users can send USDT from their NEAR Intents balance to other chains (Ethereum, Arbitrum, Base, Solana, etc.).
- **Usage:** `lib/near-intents-withdraw.ts` — `IntentsSDK`, `createIntentSignerNEP413`, `createPoaBridgeRoute`, `createOmniBridgeRoute`; `processCrossChainWithdrawal`, `getRouteConfigForNetwork`, `USDT_WITHDRAW_SUPPORTED_NETWORK_IDS`.
- **Bridges:** POA (Passive Service, e.g. `bridge.chaindefuser.com`) for USDT to Ethereum/Arbitrum/Solana; Omni for Base. NEAR-native withdraw is direct `ft_withdraw` (see `near-intents.ts` if present).
- **Optional:** `NEXT_PUBLIC_NEAR_INTENTS_SOLVER_RELAY_API_KEY` (Partners Portal) for relay.

---

### 7. **Privy — NEAR wallet and auth**

- **Package:** `@privy-io/react-auth` (and extended chains).
- **Role:** Login (social, email, passkey) and **creation/linking of a NEAR wallet** (embedded). User gets a NEAR account ID; signing is done with `useSignRawHash` for `chainType: "near"`, used by `NearPrivySigner`.
- **Usage:** `PrivyProvider`, `NearProvider` (wraps Privy); `usePrivy()`, `useCreateWallet()`, `useSignRawHash()`; `getNearWalletAddress(user)` in `NearContext`.
- **Docs:** [Privy](https://docs.privy.io/), NEAR embedded wallet flow.

---

### 8. **Escrow and relayer (backend NEAR)**

- **Escrow account:** `ESCROW_ACCOUNT_ID` (e.g. `escrow.veridoc.near`) receives USDT for second-opinion payments; backend splits 85% specialist / 15% platform after delivery delay.
- **Relayer account:** `NEAR_RELAYER_ACCOUNT_ID` / `NEAR_RELAYER_PRIVATE_KEY` — pays gas for meta-transactions (relay-withdraw, relay-escrow-deposit). Uses `@near-js/accounts`, `JsonRpcProvider`, `KeyPairSigner`.
- **Cron:** `app/api/cron/release-escrow/route.ts` — releases USDT from escrow to specialist and platform fee accounts (storage_deposit + ft_transfer via `lib/near-usdt.ts`).

---

## Other technologies (non-NEAR)

- **Next.js 16** — App Router, server actions, API routes.
- **LlamaParse / LlamaIndex** — PDF parsing and extraction for lab reports (optional pipeline).
- **Google Generative AI** — Alternative AI provider (e.g. `@google/generative-ai`) for some flows; NEAR AI is primary for private blood-test analysis.
- **LlamaParse** — `llama-parse` package for document parsing.
- **Caddy** — Optional HTTPS for local dev (`dev:https`).

---

## Summary table (NEAR-focused)

| Area              | Technology / API        | Purpose                                      |
|-------------------|-------------------------|----------------------------------------------|
| Private AI        | NEAR AI Cloud API       | Blood test analysis (chat completions)      |
| Chain             | NEAR Protocol (RPC)     | Accounts, state, transactions                |
| Identity / wallet | Privy + NEAR            | Login and NEAR wallet creation & signing     |
| Tokens            | USDT NEP-141 on NEAR    | Balances, transfers, escrow payments        |
| Gasless UX        | NEP-366 Signed Delegate | Relayer pays gas for withdraw & escrow       |
| Cross-chain       | NEAR Intents + Defuse   | Deposit from many chains; withdraw to EVM/Solana |
| Payments          | Escrow + relayer        | Second opinion: USDT in, 85/15 split        |
