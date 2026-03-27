# QuoteGuard

**AI-powered quoting with on-chain escrow for solo contractors and tradespeople.**

> Built for OneHack 3.0 — OneChain Track

---

## The Problem

Solo contractors and freelancers lose money on nearly every job. They eyeball quotes, forget to factor in insurance, tax, vehicle costs, and downtime — then chase unpaid invoices for weeks. Industry surveys show **over 60% of independent tradespeople undercharge** because they price based on gut feel rather than actual cost-of-business math.

Even when the price is right, getting paid is another battle. Clients delay, dispute, or ghost. Traditional escrow services charge steep fees and take days to settle. The result: talented contractors leave the industry or stay trapped in a cycle of underbidding and cash flow stress.

## The Solution

QuoteGuard is a conversational AI copilot that turns a plain-English project description into a **profitability-checked quote** — then locks payment into **milestone-based smart contract escrow** on OneChain so both sides are protected.

**For contractors**: Describe the job ("bathroom remodel, 5 days, $1,200 in materials"), and the AI generates a line-item quote that accounts for your real overheads — insurance, tools, tax, desired salary, profit margin. You'll see instantly whether the quote is above or below your break-even point before you send it.

**For clients**: A simple payment portal shows the project milestones. Fund each milestone upfront — your money is held in escrow, not in the contractor's pocket. Release payment only when you're satisfied with the work. Dispute resolution is built in.

**No one touches crypto directly.** OneWallet handles signing, gas is sponsored by the platform, and all amounts display in USD. The blockchain is invisible infrastructure — what users see is a clean, modern payment flow.

---

## Key Features

| Feature | Description |
|---|---|
| **AI Quote Generation** | Describe your project in plain English. The AI (Gemini 3.1 Pro) researches current market rates via Tavily, then generates a detailed quote with line items, labor hours, and material costs. |
| **Profitability Engine** | Every quote is checked against your real business costs. See break-even amount, profit margin, minimum sustainable day rate, and warnings if you're undercharging. |
| **Business Overheads Setup** | Input your fixed costs (insurance, vehicle, tools, software, rent), salary target, tax rates, and working schedule. The AI uses this to price every job accurately. |
| **On-Chain Escrow** | Quotes convert into milestone-based escrow contracts on OneChain. Client funds are locked on-chain and released per milestone — no intermediary, no delays. |
| **Client Payment Portal** | Share a link with your client. They connect a wallet, fund milestones, and approve releases. Dispute resolution is built into the contract. |
| **PDF Export** | Download professional PDF invoices/quotes to send to clients. |
| **Wallet-First Auth** | No passwords. Connect your OneWallet and you're in. Accounts are auto-created on first connection. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript |
| Backend | FastAPI (Python 3.10+), Pydantic |
| AI | Google Gemini 3.1 Pro (`google-genai`), Tavily (real-time market rates) |
| Database | Supabase (PostgreSQL) with Realtime |
| Blockchain | OneChain Testnet (Sui-fork L1), Move smart contracts |
| Wallet | OneWallet + `@mysten/dapp-kit` |
| Escrow Token | OCT (OneChain native token, `0x2::oct::OCT`) |

---

## Demo Walkthrough

### Contractor Flow

1. **Connect Wallet** — Open the app and connect with OneWallet. Account is created automatically.
2. **Set Your Overheads** — Go to the Overheads page. Enter your fixed monthly costs (insurance, vehicle, tools, software, etc.), desired annual salary, tax rates, and working schedule.
3. **Create a Quote** — Click "New Quote". Describe your project in plain English or pick a template (Home Renovation, Web Dev, Video Production, etc.). The AI generates a full quote with line items and profitability analysis.
4. **Review Profitability** — See your break-even amount, profit margin, and minimum day rate. The AI warns you if the quote is below your cost threshold.
5. **Accept & Save** — Accept the quote. It becomes a project with milestones.
6. **Create Escrow** — Enter the client's wallet address. An on-chain escrow contract is deployed with milestone amounts and description hashes.
7. **Share Payment Link** — Send the client the payment portal URL (`/pay/<escrowId>`).
8. **Get Paid** — As you complete milestones, request release. The client approves and funds transfer directly to your wallet.

### Client Flow

1. **Open Payment Link** — The contractor shares a URL. No account setup needed.
2. **Connect Wallet** — Connect OneWallet to interact with the escrow.
3. **View Milestones** — See the full project breakdown, amounts, and status for each milestone.
4. **Fund Milestones** — Deposit OCT tokens into escrow for each milestone. Funds are locked on-chain.
5. **Approve Releases** — When the contractor requests release, review the work and approve payment.
6. **Dispute if Needed** — If work doesn't meet expectations, dispute the milestone. Funds stay locked until resolved.

---

## Getting Started (Judge Setup)

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+ and **pip**
- **Supabase CLI** (`npm install -g supabase`)
- **OneWallet** browser extension ([download](https://chromewebstore.google.com/detail/onewallet/oekmgcgbldahhkcaliifenlbmjfnddlk))
- **Docker** (for local Supabase)

### 1. Clone & Install

```bash
git clone <repo-url>
cd OneHack3.0
make install
```

### 2. Environment Variables

```bash
make env    # Creates .env from .env.example
```

Edit `.env` and fill in your keys:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | `http://localhost:54321` (local Supabase) |
| `SUPABASE_ANON_KEY` | Printed when you run `supabase start` |
| `SUPABASE_SERVICE_ROLE_KEY` | Printed when you run `supabase start` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `ONECHAIN_RPC_URL` | `https://rpc-testnet.onelabs.cc:443` |
| `ESCROW_PACKAGE_ID` | `0x17280a0a538cafe34855f09db4f77cf5f11e5cb57c5b9910c151ff4fc3160e7b` |
| `USDC_TYPE` | `0x2::oct::OCT` |

The frontend `.env.local` variables (`NEXT_PUBLIC_*`) mirror the backend ones. See `.env.example` for the full list.

### 3. Start the Database

```bash
make dev-supabase    # Starts local Supabase (Docker required)
make db-reset        # Run all migrations + seed data
```

### 4. Start the App

```bash
make dev    # Starts Supabase + Backend (port 8000) + Frontend (port 3000)
```

Or run services individually:

```bash
make dev-backend     # FastAPI on port 8000
make dev-frontend    # Next.js on port 3000
```

### 5. Get Testnet Tokens

Request OCT from the OneChain faucet for gas and escrow funding:

```bash
curl -X POST https://faucet-testnet.onelabs.cc/gas \
  -H "Content-Type: application/json" \
  -d '{"FixedAmountRequest":{"recipient":"<your-wallet-address>"}}'
```

This gives you 1 OCT (1,000,000,000 minor units) — enough for gas fees and funding test milestones.

### 6. Try It Out

1. Open `http://localhost:3000` in your browser
2. Click **Get Started** and connect your OneWallet
3. Go to **Overheads** and set up some sample business costs
4. Click **New Quote** and describe a project (or click a template)
5. Accept the generated quote
6. On the project page, click **Create Escrow** with a second wallet address as the client
7. Open the payment link in another browser with the client wallet to fund milestones

---

## Project Structure

```
OneHack3.0/
├── frontend/          Next.js 16 app (React 19, Tailwind v4)
│   └── src/
│       ├── app/       Route groups: (auth), (dashboard), (client)
│       ├── components/ Chat UI, Escrow tracker, Quote cards
│       ├── hooks/     useChat, useQuote, useEscrow, useOverheads
│       └── lib/       API helpers, OneChain transaction builders
├── backend/           FastAPI server
│   └── app/
│       ├── routers/   REST endpoints (chat, projects, quotes, users, overheads)
│       └── services/  AI quoting, profitability engine, PDF gen, event indexer
├── contracts/         Move smart contract (escrow.move)
└── supabase/          Migrations and seed data
```

---

## Smart Contract

The escrow contract (`contracts/sources/escrow.move`) is deployed on OneChain Testnet.

**Package ID**: `0x17280a0a538cafe34855f09db4f77cf5f11e5cb57c5b9910c151ff4fc3160e7b`

| Action | Who Can Call | What Happens |
|---|---|---|
| Create Escrow | Contractor | Deploys escrow with milestone amounts and client address |
| Fund Milestone | Client | Deposits OCT into a specific milestone |
| Request Release | Contractor | Signals milestone work is complete |
| Release Milestone | Client | Approves payment — funds transfer to contractor |
| Dispute Milestone | Either party | Freezes milestone until resolved |
| Cancel Escrow | Either party | Refunds unfunded milestones to client |

See [TRANSACTION_SETUP.md](./TRANSACTION_SETUP.md) for full contract details, event types, and troubleshooting.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│  Next.js 16 · React 19 · Tailwind v4 · @mysten/dapp-kit│
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │ AI Chat  │  │ Dashboard│  │ Client Pay Portal  │    │
│  │ (Quoting)│  │(Projects)│  │ (Fund/Release/     │    │
│  │          │  │          │  │  Dispute)           │    │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘    │
│       │              │                 │                │
│       ▼              ▼                 ▼                │
│  ┌─────────────────────────────────────────────────┐    │
│  │  apiFetch (REST)     │  useEscrow (on-chain tx) │    │
│  └──────────┬───────────┴──────────┬───────────────┘    │
└─────────────┼──────────────────────┼────────────────────┘
              │                      │
              ▼                      ▼
┌─────────────────────┐   ┌──────────────────────┐
│   FastAPI Backend    │   │   OneChain Testnet    │
│                      │   │                      │
│  • AI Quote Engine   │   │  Escrow<OCT> Contract │
│    (Gemini + Tavily) │   │  • fund_milestone    │
│  • Profitability Calc│   │  • release_milestone │
│  • PDF Generation    │   │  • dispute_milestone │
│  • Event Indexer ◄───┼───┤  (emits events)      │
│                      │   │                      │
└──────────┬───────────┘   └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Supabase PostgreSQL │
│                      │
│  users, projects,    │
│  quotes, milestones, │
│  escrow_events,      │
│  conversations       │
└──────────────────────┘
```

---

## Team

Built at OneHack 3.0.
