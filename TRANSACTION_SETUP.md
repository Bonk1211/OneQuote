# Transaction Setup Guide

End-to-end guide to get QuoteGuard escrow transactions running on OneChain testnet.

## Deployed Contract

| Item | Value |
|---|---|
| **Package ID** | `0x17280a0a538cafe34855f09db4f77cf5f11e5cb57c5b9910c151ff4fc3160e7b` |
| **Network** | OneChain Testnet |
| **RPC** | `https://rpc-testnet.onelabs.cc:443` |
| **Native token** | OCT (`0x2::oct::OCT`) — used as escrow payment token for testnet |
| **Faucet** | `https://faucet-testnet.onelabs.cc/gas` |
| **Deploy tx** | `DaPJLoQPepayYBEVyYW8jMjeibDp81ujanPC9SAdEZbS` |

## Prerequisites

- OneWallet browser extension installed
- Testnet OCT tokens for gas (use the faucet below)

## Step 1: Get Testnet Tokens

Request OCT from the OneChain faucet:

```bash
curl -X POST https://faucet-testnet.onelabs.cc/gas \
  -H "Content-Type: application/json" \
  -d '{"FixedAmountRequest":{"recipient":"<your-wallet-address>"}}'
```

This gives 1 OCT (1,000,000,000 minor units) for gas and escrow funding.

## Step 2: Environment Variables (already configured)

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_ONECHAIN_RPC_URL=https://rpc-testnet.onelabs.cc:443
NEXT_PUBLIC_ESCROW_PACKAGE_ID=0x17280a0a538cafe34855f09db4f77cf5f11e5cb57c5b9910c151ff4fc3160e7b
NEXT_PUBLIC_USDC_TYPE=0x2::oct::OCT
```

### Backend — `backend/.env`

```env
ONECHAIN_RPC_URL=https://rpc-testnet.onelabs.cc:443
ESCROW_PACKAGE_ID=0x17280a0a538cafe34855f09db4f77cf5f11e5cb57c5b9910c151ff4fc3160e7b
USDC_TYPE=0x2::oct::OCT
GAS_SPONSOR_PRIVATE_KEY=0x<sponsor-wallet-private-key>
```

### Root — `.env`

```env
ESCROW_PACKAGE_ID=0x17280a0a538cafe34855f09db4f77cf5f11e5cb57c5b9910c151ff4fc3160e7b
USDC_TYPE=0x2::oct::OCT
```

## Step 4: Fund Your Wallet

1. Open the app and connect with OneWallet
2. Get testnet SUI from the faucet for gas fees
3. Mint or acquire test USDC tokens to fund escrow milestones

## Architecture Overview

### Transaction Flow

```
User clicks "Create Escrow"
        │
        ▼
useEscrow hook → buildCreateEscrow()
        │
        ▼
Transaction built client-side (Sui SDK Transaction API)
        │
        ▼
dapp-kit useSignAndExecuteTransaction → OneWallet signs
        │
        ▼
Transaction submitted to OneChain RPC
        │
        ▼
Event indexer (backend) picks up on-chain events
        │
        ▼
Database updated (projects, milestones, escrow_events)
```

### Key Files

| File | Purpose |
|---|---|
| `frontend/src/lib/onechain/transactions.ts` | Transaction builders for all 6 escrow functions |
| `frontend/src/hooks/useEscrow.ts` | React hook wrapping dapp-kit signing |
| `frontend/src/lib/onechain/constants.ts` | Package ID, USDC type, RPC URL from env |
| `frontend/src/lib/onechain/client.ts` | Low-level JSON-RPC client for object/event queries |
| `backend/app/services/event_indexer.py` | Background poller for on-chain escrow events |
| `contracts/sources/escrow.move` | The Move smart contract source |

### Transaction Builders

| Function | Move Entry Function | Caller |
|---|---|---|
| `buildCreateEscrow()` | `create_escrow<T>` | Platform / contractor |
| `buildFundMilestone()` | `fund_milestone<T>` | Client (payer) |
| `buildRequestRelease()` | `request_release<T>` | Operator (contractor) |
| `buildReleaseMilestone()` | `release_milestone<T>` | Client (payer) |
| `buildDisputeMilestone()` | `dispute_milestone<T>` | Either party |
| `buildCancelEscrow()` | `cancel_escrow<T>` | Either party |

### Contract Functions & Permissions

| Action | Who Can Call | Precondition |
|---|---|---|
| Create escrow | Anyone (typically backend) | Valid milestone data |
| Fund milestone | Client only | Milestone status = pending |
| Request release | Operator only | Milestone status = funded |
| Release milestone | Client only | Milestone status = funded or release_requested |
| Dispute milestone | Client or operator | Milestone status = funded or release_requested |
| Cancel escrow | Client or operator | Escrow not completed or already cancelled |

## Readiness Checklist

- [x] Move contract deployed to OneChain testnet
- [x] `NEXT_PUBLIC_ESCROW_PACKAGE_ID` set to real package ID
- [x] `NEXT_PUBLIC_USDC_TYPE` set to real coin type (`0x2::oct::OCT`)
- [x] Backend `ESCROW_PACKAGE_ID` set (stops event indexer errors)
- [x] Backend `USDC_TYPE` set
- [ ] Testnet OCT tokens in wallet (use faucet)
- [ ] OneWallet connected in browser

## Troubleshooting

### Event indexer spamming "Invalid params" errors

The `ESCROW_PACKAGE_ID` is still a placeholder (`0x...`). Set it to the real deployed address or leave it empty to silence the indexer until the contract is deployed.

### Transaction fails with "Invalid struct type"

The `USDC_TYPE` environment variable is missing or incorrect. It must be the fully qualified coin type: `0x<package>::<module>::<type>`.

### "Wallet not connected" error

Ensure OneWallet is installed, unlocked, and connected via the ConnectButton in the app header.

### Transaction succeeds but database not updated

The event indexer may be behind or not running. Check that the backend is running (`make dev-backend`) and that `ESCROW_PACKAGE_ID` is set correctly in the backend `.env`.
