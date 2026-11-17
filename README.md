---
title: web3_proj — README
folder: PROJECTS/web3_proj
type: readme
status: live
updated: 2026-11-18
---

# web3_proj — vehicle marketplace with on-chain escrow

A working marketplace where the buyer's USDC is held by a smart contract, not by the platform.
The seller ships once the money is locked; the buyer releases it by confirming delivery. If the
buyer goes silent, a 14-day timeout releases the funds to the seller. If the vehicle is wrong, a
dispute freezes the timer for an arbiter.

**Live:** https://web3.heurist.online
**Settling on:** Ethereum Sepolia (chain id 11155111)

## Deployment

| | |
|---|---|
| Escrow contract | [`0x4e8DFBd676AeEB10D57727DdFF2450B175913e0E`](https://sepolia.etherscan.io/address/0x4e8DFBd676AeEB10D57727DdFF2450B175913e0E) |
| Test USDC (6 dp) | [`0xBA24365396f6f92BDA5C0087d8806B7C545eb8e3`](https://sepolia.etherscan.io/address/0xBA24365396f6f92BDA5C0087d8806B7C545eb8e3) |
| Deploy block | 12,155,958 |
| Release timeout | 1,209,600 s (14 days) |
| Arbiter | `0x3fBEb93D2bcD2b5A727CFD9a61348a0EB745f452` |

Verified end to end: escrow #1 funded with 21,750 USDC, shipped, confirmed and released — seller
holds the funds, contract balance zero, events indexed at blocks 12,155,961–12,155,965.

```bash
cast chain-id --rpc-url $RPC                                   # 11155111
cast call $ESCROW "RELEASE_TIMEOUT()(uint64)" --rpc-url $RPC    # 1209600
cast call $ESCROW "getEscrow(uint256)(address,address,uint256,uint64,uint64,uint8)" 1
```

## Architecture

```
Browser (React SPA) ──HTTPS/JSON──▶ API (NestJS) ──SQL──▶ PostgreSQL
                                        │
                                        └──viem──▶ VehicleEscrow.sol on Sepolia
                                                        │
                                            logs ──▶ indexer ──▶ ChainEvent
```

- **Contract** — Solidity 0.8.28, non-upgradeable, single immutable arbiter, reentrancy guards,
  no proxy and no `delegatecall`. 23 Foundry tests including a live reentrancy attack and the
  exact timeout boundary.
- **API** — NestJS 12, Prisma 6, Zod validation, SIWE authentication, rate limiting, and a
  self-describing surface at `GET /api/meta` (29 endpoints, reflected from the router).
- **Indexer** — reads `getLogs` from the deploy block, writes append-only `ChainEvent` rows with
  a unique `(txHash, logIndex)`, so the database can be rebuilt from the chain.
- **Web** — React 19 + Vite + Tailwind 4, hash routing, 15 sections in four acts.

## Repository layout

```
contracts/   Foundry project — VehicleEscrow.sol, MockUSDC.sol, tests
api/         NestJS service — auth, listings, escrows, chain, indexer, meta
web/         React SPA — 15 sections, printable blueprint in public/system.html
scripts/     deploy-sepolia.sh, deploy-local.sh, backup-db.sh, audit.py
docs/        scope, architecture, decisions, gap register, runbook
.github/     CI — Foundry tests, API typecheck, web build
```

## Site structure

| Act | Sections |
|---|---|
| Start | Overview · Transactions · Run an escrow |
| 1 · Scope | Requirements · Escrow |
| 2 · Build | Architecture · Chain · Hashing & auth · Token |
| 3 · Operate | API explorer · Security · Operations · Status · References |
| Reference | System blueprint (`/system.html`) |

## Running it

Development happens on the host; the database and chain configuration live in `api/.env`
(mode 600, never committed).

```bash
# contract
cd contracts && forge test

# api
cd api && npm run build && sudo systemctl restart web3proj-api

# web
cd web && npm run build          # served by nginx from web/dist

# deploy to Sepolia (refuses to run unfunded)
./scripts/deploy-sepolia.sh
```

## Testing and CI

- `forge test` — 23/23 passing, including reentrancy and boundary cases.
- `tsc --noEmit` — clean on both API and web.
- GitHub Actions runs all three on every push.
- `scripts/audit.py` — 633 assertions across routes, wording, facts, contract reads, headers,
  operations, links and build output.

## Operations

- systemd supervises the API; nginx serves the SPA and proxies `/api`.
- Let's Encrypt TLS with automatic renewal; HTTP redirects to HTTPS.
- Nightly `pg_dump` at 03:00 GMT+8 with seven-day rotation.
- Runtime DB role holds DML only; migrations run as the owner role.
- Global API rate limit 120/min, auth routes 10/min.
- Journald capped at 200 MB.

## Scope

Built: contract, deployment, escrow lifecycle, indexer, API, site, CI, backups, monitoring of
disk and service health.

Next milestones, in order: independent contract audit, Etherscan source verification, wallet
signing so each party submits their own transactions, image storage, and formal arbitration
evidence handling. Mainnet follows the audit.

## Sign-in

The site is gated by a sign-in card; the check is a SHA-256 digest plus a `sessionStorage` flag —
a presentation gate, not access control. `/system.html` enforces the same flag.

## Further reading

| File | Contents |
|---|---|
| [`architecture.md`](architecture.md) | Full system description |
| [`docs/03-decisions.md`](docs/03-decisions.md) | Decisions with rationale and reversal triggers |
| [`docs/01-mvp-scope.md`](docs/01-mvp-scope.md) | What is in scope and what is not |
| [`docs/05-deploy-runbook.md`](docs/05-deploy-runbook.md) | Deployment procedure |
