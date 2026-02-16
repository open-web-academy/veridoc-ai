# Veridoc

Web application for clinical history and lab result analysis with AI, USDT (NEAR) payments, and a medical second-opinion marketplace. Users sign in with email or social login (Privy), get a NEAR wallet in the background, and can receive USDT, pay specialists via escrow, and withdraw to other networks.

---

## Related repositories

The specialist verification and consultation backend runs as a **separate service**:

- **[veridoc-ai-backend](https://github.com/open-web-academy/veridoc-ai-backend)** — Express/Node.js API with MongoDB Atlas for specialist accounts, consultations, and verification. Set `SPECIALIST_VERIFICATION_API_URL` in this app to point to your deployed backend (e.g. `veridoc-ai-backend.vercel.app`).

This frontend can run without the backend (marketplace uses internal/fallback data); for full specialist onboarding and consultation flows, deploy and configure the backend.

---

## Main features

- **AI analysis** — Private analysis of blood work and medical documents (NEAR AI, LlamaParse for PDFs).
- **Login without seed phrases** — Email, social, or passkey via [Privy](https://docs.privy.io/); a NEAR wallet is created automatically.
- **USDT payments** — USDT balance on NEAR, deposits from multiple chains (NEAR Intents), gasless withdrawals (NEP-366 meta-transactions).
- **Second opinion** — Payments in escrow; when the specialist delivers, funds are released automatically (85% specialist, 15% platform).
- **Specialist marketplace** — Verified profiles, onboarding, and integrated payments.

---

## Tech stack

- **Frontend / Backend:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions, API routes)
- **Auth & wallet:** [Privy](https://docs.privy.io/) + NEAR (implicit account per user)
- **Blockchain:** [NEAR Protocol](https://near.org/) — RPC, USDT (NEP-141), NEP-366 (relayer), [NEAR Intents](https://docs.near-intents.org/) for multichain deposits/withdrawals
- **AI:** [NEAR AI](https://near.ai) (medical analysis), [LlamaParse](https://cloud.llamaindex.ai) (PDF extraction)
- **Media:** [Cloudinary](https://cloudinary.com/) (specialist photos and documents)
- **i18n:** next-intl (es/en)

Detailed technologies and APIs: [docs/TECHNOLOGIES_AND_APIS.md](docs/TECHNOLOGIES_AND_APIS.md).

---

## Requirements

- **Node.js** 20+
- **npm** (or yarn/pnpm/bun)
- Accounts and API keys (see below): Privy, LlamaParse, NEAR AI; optional: Cloudinary, NEAR relayer, escrow, specialist API

---

## Installation and development

```bash
# Clone and install dependencies
git clone <repo-url>
cd veridoc-ai
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys (see Environment variables)

# Start in development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For local HTTPS (e.g. Privy): see [docs/CADDY_SETUP.md](docs/CADDY_SETUP.md).

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values. In production (Vercel, Amplify, etc.) set the same variables in your hosting panel; `.env` is not committed to Git.

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy App ID (login and wallets) | Yes |
| `LLAMA_CLOUD_API_KEY` | LlamaParse API key (PDFs) | Yes |
| `NEAR_AI_API_KEY` | NEAR AI API key (medical analysis) | Yes |
| `SPECIALIST_VERIFICATION_API_URL` | Specialist verification API base URL (e.g. backend above) | No (marketplace uses internal data if unset) |
| `CLOUDINARY_URL` | Cloudinary (specialist photos/documents) | No |
| `NEXT_PUBLIC_NEAR_NETWORK` | `mainnet` or `testnet` | No (default: mainnet) |
| `NEAR_FAUCET_ACCOUNT_ID` / `NEAR_FAUCET_PRIVATE_KEY` | Account that funds new wallets (auto activation) | No (recommended for UX) |
| `NEAR_RELAYER_ACCOUNT_ID` / `NEAR_RELAYER_PRIVATE_KEY` | Relayer for USDT withdrawals (pays gas) | No (required for withdrawals) |
| `ESCROW_ACCOUNT_ID` / `ESCROW_PRIVATE_KEY` | Escrow for second-opinion payments | No (required for specialist payouts) |
| `PLATFORM_FEE_ACCOUNT_ID` | Account receiving the 15% fee | No (default: veridoc.near) |
| `CRON_SECRET` | Secret for `/api/cron/release-escrow` | No (required if using external cron) |
| `NEXT_PUBLIC_NEAR_INTENTS_SOLVER_RELAY_API_KEY` | Solver relay API key (POA withdrawals to other chains) | No |

Details and examples: [.env.example](.env.example). Production on Amplify: [docs/AMPLIFY_ENV.md](docs/AMPLIFY_ENV.md).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Production server (after `build`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (no emit) |

---

## Project structure (summary)

```
app/
  [locale]/           # i18n routes (es/en)
    page.tsx          # Home
    analisis/         # Document / blood analysis
    profile/          # User profile, payments, balance, withdrawals
    marketplace/      # Specialist listing and detail, second opinion
    status/           # Service status (/status)
    veridoc/          # Veridoc flow (upload, analysis, results)
  api/                # API routes
    near/             # relay-withdraw, relay-escrow-deposit, fund
    cron/             # release-escrow (payment release)
    consultations/    # confirm-payment, etc.
    status/           # GET status of all services
context/              # NearContext, Privy
lib/                  # near-config, near-usdt, near-intents-withdraw, escrow, cloudinary
docs/                 # Documentation (AMPLIFY_ENV, ESCROW, TECHNOLOGIES_AND_APIS, etc.)
```

---

## Service status

The **`/status`** route (or `/[locale]/status`) calls `/api/status` and shows the status of all configured services:

- Privy, NEAR RPC, NEAR funding, NEAR relay  
- LlamaParse, NEAR AI, Cloudinary  
- NEAR Intents Solver, Specialist verification API  
- Escrow (config + on-chain), Cron release escrow  

Useful to verify environment variables and external services in local or production.

---

## Additional documentation

| Document | Content |
|----------|---------|
| [docs/TECHNOLOGIES_AND_APIS.md](docs/TECHNOLOGIES_AND_APIS.md) | Technologies and APIs (NEAR, Privy, USDT, escrow, AI, etc.) |
| [docs/AMPLIFY_ENV.md](docs/AMPLIFY_ENV.md) | Environment variables on AWS Amplify |
| [docs/ESCROW_SEGUNDA_OPINION_NEAR.md](docs/ESCROW_SEGUNDA_OPINION_NEAR.md) | Escrow and specialist payment flow |
| [docs/ESCROW_IMPLEMENTATION_SUMMARY.md](docs/ESCROW_IMPLEMENTATION_SUMMARY.md) | Escrow implementation summary |
| [docs/CADDY_SETUP.md](docs/CADDY_SETUP.md) | Local HTTPS with Caddy |
| [docs/NEAR_INTENTS_PAGOS_ESPECIALISTAS.md](docs/NEAR_INTENTS_PAGOS_ESPECIALISTAS.md) | NEAR Intents and payments |

---

## Deployment

- **Vercel:** Connect the repo and set environment variables in the dashboard. Build: `npm run build`, output: Next.js.
- **AWS Amplify:** See [docs/AMPLIFY_ENV.md](docs/AMPLIFY_ENV.md) to configure variables and make them available at runtime (including `.env.production` in the build if needed).

After deploying, check `/status` to confirm required services are operational.

---

## License

Private project. Contact maintainers for use or distribution.
