# plan.md — build plan

**Project:** `web3_proj` — Web3 vehicle marketplace MVP with non-custodial USDC escrow
**Repo:** https://github.com/azlanabas/web3_proj
**Updated:** 2026-11-17 GMT+8
**Status:** PLANNING — no code, nothing deployed

Companion documents: [`architecture.md`](architecture.md) · [`docs/01-mvp-scope.md`](docs/01-mvp-scope.md) ·
[`docs/02-architecture.md`](docs/02-architecture.md) ·
[`docs/03-decisions.md`](docs/03-decisions.md) ·
[`docs/04-gap-register.md`](docs/04-gap-register.md) ·
[`docs/05-deploy-runbook.md`](docs/05-deploy-runbook.md) · Work items: [`todo.md`](todo.md)

---

## 1. Objective

Prove one complete escrow loop on a public testnet:

> a seller lists a vehicle → a buyer funds the escrow in USDC → the seller ships →
> the buyer confirms → the contract pays the seller, with the platform never holding funds.

Everything else is deferred. This is an MVP, not a platform.

## 2. Fixed constraints

| Constraint | Value | Source |
|---|---|---|
| Stack | TypeScript / Node / React / PostgreSQL | D-03 |
| Shape | NestJS + Vite/React/Tailwind (GDA Stack C) | D-03 |
| Escrow | Non-custodial, contract-held | D-02 |
| Asset | Whole vehicles, not fractional | D-01 |
| Host | AWS `ap-southeast-1`, single EC2 (reused) | D-05 |
| Domain | `web3.heurist.online` | D-07 |
| Excluded host | kerry takes no part | D-06 |
| Settlement | USDC | D-09 |
| Chain | Ethereum Sepolia for the MVP | D-11 |

## 3. Delivery phases

Each phase has a **gate**. Do not start the next phase until the gate passes.

### Phase 0 — Unblock
Clear the credential and infrastructure unknowns: AWS session, EC2 identity, Elastic IP,
DNS record, repo wiring, ORM and chain decisions.
**Gate:** `aws sts get-caller-identity` succeeds, instance ID known, `dig web3.heurist.online`
returns the Elastic IP.

### Phase 1 — Contracts
One `VehicleEscrow.sol`: create, fund, ship, confirm, refund, cancel. USDC ERC-20 transfers,
reentrancy guard, arbiter restricted to refund-only. Foundry test suite covering the
invariants in `docs/02-architecture.md`.
**Gate:** `forge test` green; deployed to Sepolia with a recorded address and tx hashes.

### Phase 2 — Backend
NestJS API: SIWE auth, listings CRUD, escrow intent, tx verification, chain indexer writing
`chain_events` and reconciling `escrows.status`. Postgres schema per the architecture doc.
**Gate:** full escrow loop drivable via REST against Sepolia; DB reconciles after a restart.

### Phase 3 — Frontend
Vite/React: browse, detail, wallet connect, create listing, fund escrow, ship, confirm.
Tailwind. No design system beyond tokens.
**Gate:** the Phase 2 loop performed through the UI by a human, not curl.

### Phase 4 — Admin
Read-mostly operator view of all escrows with chain tx links, plus the refund action.
**Gate:** refund issued from the UI and confirmed on-chain.

### Phase 5 — Deploy
EC2 prep, systemd unit, Nginx vhost, certbot TLS, DNS A record. No Docker (D-15).
**Gate:** all verification commands in `docs/05-deploy-runbook.md` Phase 8 pass.

### Phase 6 — Prove it
Recorded end-to-end run on testnet with tx hashes captured in the repo README.
**Gate:** a stranger can read the README and verify the loop happened.

## 4. Milestones

| M | Meaning | Phase |
|---|---|---|
| M0 | Infrastructure unblocked | 0 |
| M1 | Contract live on Sepolia | 1 |
| M2 | Loop works via API | 2 |
| M3 | Loop works in browser | 3 |
| M4 | Operator can refund | 4 |
| M5 | Public HTTPS URL live | 5 |
| M6 | End-to-end run recorded | 6 |

## 5. Ordering rationale

Contract first, because the API's shape is dictated by the contract's events, not the reverse.
Backend before frontend, so the UI is built against a working loop rather than mocks. Deploy
last, because a broken deployment in week one teaches nothing.

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `t4g.small` RAM (2 GB) too small for Node build + Postgres | Build OOM | Measure early in Phase 5; add swap or size up |
| Dynamic public IP breaks DNS | Site unreachable after restart | Elastic IP in Phase 0 |
| Arbiter key compromise | Mass refunds | Key never leaves server env; refund-only power caps damage |
| No contract audit | Mainnet unacceptable | MVP stays on testnet; audit is a launch blocker |
| Jurisdiction unresolved | Cannot legally launch | Testnet only until D-14 closes |
| Trust framing overstated | Misleading users | Docs state the delivery oracle is the buyer |

## 7. Explicit non-goals

KYC/AML · fiat on/off-ramp · fractional or RWA tokens · multi-chain · dispute evidence UI ·
DMV/lien integration · auctions · email notifications · mobile app · mainnet deployment.

## 8. Definition of done

1. `forge test` passes and the contract is deployed to Sepolia.
2. A buyer funds escrow and a seller is paid; a second escrow is refunded.
3. `https://web3.heurist.online` serves the app over valid TLS.
4. Chain events reconcile to Postgres across a restart.
5. The recorded run's tx hashes are in the repo.
