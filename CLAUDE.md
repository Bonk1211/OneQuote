# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuoteGuard is a freemium SaaS for solo contractors/tradespeople. An AI conversational interface parses project descriptions into profitability-checked quotes, which can then be locked into milestone-based escrow smart contracts on OneChain (a Sui-fork L1). Users interact via a browser wallet (OneWallet / @mysten/dapp-kit); they never touch crypto directly thanks to gas sponsorship.

## Commands

### Run all services
```bash
make dev              # Starts Supabase, backend (port 8000), frontend (port 3000) concurrently
make dev-frontend     # Next.js only
make dev-backend      # FastAPI only (uvicorn --reload)
```

### Build & lint
```bash
cd frontend && npm run build          # Production build
cd frontend && npx tsc --noEmit       # Type check
cd frontend && npm run lint           # ESLint
cd backend && python3 -m pytest tests/ -v   # Backend tests
```

### Database
```bash
make db-reset         # Reset Supabase DB (all migrations + seed)
make db-migrate       # Run pending migrations
```

### Install dependencies
```bash
make install          # Installs both npm and pip deps
make env              # Creates .env files from .env.example templates
```

## Architecture

**Monorepo with 4 packages** — `frontend/`, `backend/`, `contracts/`, `supabase/`.

### Auth: Wallet-First Identity
- **No traditional auth.** The OneChain wallet address is the sole identity.
- Frontend sends `Authorization: Bearer 0x<address>` on every API call.
- Backend (`dependencies.py:get_current_user`) looks up the user by `onechain_address` in the `users` table and auto-creates on first connection.
- The `users.id` FK to `auth.users` has been dropped; users get `gen_random_uuid()` IDs.
- `@mysten/dapp-kit` provides `<ConnectButton>`, `useCurrentAccount()`, `useAutoConnectWallet()` and handles wallet modal/auto-reconnect.

### Frontend (Next.js 16 App Router, React 19, Tailwind v4)
- **Route groups**: `(auth)/` for login, `(dashboard)/` for authenticated pages, `(client)/` for the public payment portal.
- **State**: Zustand (`auth-store.ts`) for client-only profile state; React Query for all server data.
- **Hooks pattern**: `useChat`, `useQuote`, `useOverheads`, `useEscrow` each wrap `apiFetch` + React Query, passing `account?.address` as the Bearer token.
- **`apiFetch` helper** (`lib/api.ts`): Prepends `NEXT_PUBLIC_API_URL`, injects `Authorization` header, returns typed JSON.
- **Tailwind v4**: Uses `@import "tailwindcss"` and `@theme inline` in `globals.css` — no `tailwind.config.ts`.
- **Dark theme**: Zinc/indigo palette. dApp Kit has a custom `darkTheme` in `lib/dapp-kit.ts`.
- **Fonts**: Inter (body) + JetBrains Mono (monospace) via `next/font/google`.

### Backend (FastAPI, Python 3.10+)
- **Routers** under `app/routers/` — each prefixed `/api/{resource}`.
- **Services** under `app/services/` — business logic (AI quoting, profitability engine, PDF generation, escrow bridge, event indexer).
- **Config**: `pydantic-settings` in `app/config.py` reads from environment.
- **`WalletAuthMiddleware`**: Extracts wallet address from Bearer header into `request.state.wallet_address`. Routes use the `get_current_user` dependency for full user resolution.
- **Supabase access**: Backend uses the **service role key** (bypasses RLS). Two clients: `get_supabase()` (service role) and `get_supabase_anon()` (anon key).
- **Event indexer**: Runs as `asyncio.create_task` in FastAPI lifespan. Polls OneChain RPC every 5s for escrow events, idempotently inserts into `escrow_events`, and updates milestone/project statuses.
- **AI quoting pipeline** (`POST /api/chat/quote`): Fetches user overheads → builds LLM prompt with financial context → calls OpenAI GPT-4o → parses JSON from response → runs profitability engine → stores project+quote+milestones → returns analysis.

### Smart Contracts (Move on OneChain)
- `contracts/sources/escrow.move`: Generic `Escrow<T>` shared object with milestone-based OCT deposits.
- Entry functions: `create_escrow`, `fund_milestone`, `request_release`, `release_milestone`, `dispute_milestone`, `cancel_escrow`.
- Transaction construction in backend via raw JSON-RPC (`unsafe_moveCall`) — no Sui TS SDK on the backend.
- **Gas sponsorship**: Platform hot wallet co-signs gas; user signs sender portion via OneWallet. Combined and submitted by the backend.

### Database (Supabase PostgreSQL)
- 6 main tables: `users`, `base_overheads`, `projects`, `quotes`, `milestones`, `escrow_events`.
- `base_overheads` has generated columns: `total_monthly_overheads`, `total_annual_overheads`, `billable_days_per_year`.
- `quotes.line_items` is JSONB. Monetary values stored in **minor units** (pence/cents).
- Enum types: `project_status` (8 states), `quote_status` (7 states), `milestone_status` (7 states).
- RLS policies exist but backend bypasses them via service role key.
- Realtime enabled on `milestones`, `projects`, `escrow_events`.

## Sui SDK Reference
Every `@mysten/*` package ships LLM documentation in its `docs/` directory. When working with these
packages, find the relevant docs by looking for `docs/llms-index.md` files inside
`frontend/node_modules/@mysten/*/`. Read the index first to find the page you need, then read that page for
details.

## Key Conventions

- **Path alias**: Frontend uses `@/*` → `./src/*`.
- **All monetary values** in the backend and database are in minor units (pence/cents). The frontend converts for display (`formatCurrency` in `lib/utils.ts`).
- **Profitability fields** on quotes (break_even_amount, profit_margin_percent, min_daily_rate, etc.) are computed by `services/profitability.py` and stored denormalized.
- Backend routers reference `str(user.id)` for Supabase queries — `AuthenticatedUser.id` is already a string UUID.
- The `escrow` router endpoints currently return 501 (placeholder) — awaiting OneChain SDK finalization.
