---
title: 03 — Decision log
project: web3_proj
status: living
updated: 2026-11-17
---

# 03 — Decision log

Architecture Decision Records for `web3_proj`. Each entry states the decision, its status,
the reasoning, and **what would reverse it**. Superseded decisions are kept, not deleted —
the history is why the current shape looks the way it does.

Status values: `LOCKED` · `OPEN` · `SUPERSEDED`

---

## D-01 — Whole vehicles, not fractional tokens

**Status:** LOCKED (2026-11-17)

Sell complete vehicles. An NFT or on-chain attestation may record provenance, but ownership
is not split.

**Rationale:** fractional ownership of a single car means marketing a security in most
jurisdictions. That is a legal project with an engineering appendix, not an MVP.

**Reverses if:** a securities lawyer signs off on a specific structure and jurisdiction.

---

## D-02 — Non-custodial contract escrow

**Status:** LOCKED (2026-11-17)

Buyer funds go directly into a smart contract. The platform never holds or controls them.

**Rationale:** custody is what triggers money-transmission regulation. Removing it removes
the licence requirement, the audit obligation, and most of the counterparty risk.

**Reverses if:** a licensed partner is engaged and custody becomes a deliberate product
feature.

---

## D-03 — Stack: TypeScript / Node / React / PostgreSQL

**Status:** LOCKED (2026-11-17) — **SUPERSEDES an earlier answer**

The owner first selected Spuncraft (Rust/Axum/SQLx + Next.js), then instructed
*"as close as possible to the app mentioned in brief"* and confirmed the brief's literal
stack. Concretely this is **GDA Stack C**: NestJS + Vite/React/Tailwind + PostgreSQL.

**Rationale:** owner instruction is explicit and repeated. The brief names the stack, and
Stack C is the workspace's documented shape for transaction-heavy apps.

**Cost accepted:** Rust's memory safety and exact decimal arithmetic are given up; money
handling must therefore be disciplined (`numeric`, never JS floats; BigInt for token amounts).

**Reverses if:** the owner re-selects Spuncraft. Nothing is built yet, so the cost of
reversal is still zero.

---

## D-04 — MVP, not the full platform

**Status:** LOCKED (2026-11-17)

The MVP proves one loop: list → fund → ship → confirm → release, with refund as the only
branch. Everything else is deferred. See `01-mvp-scope.md`.

**Reverses if:** a launch date or client commitment demands more surface than this.

---

## D-05 — AWS hosts the whole application

**Status:** LOCKED (2026-11-17) — **SUPERSEDES "deploy on hostinger-kerry"**

The app runs on AWS. This directly contradicts the earlier instruction to deploy on
`hostinger-kerry`; the contradiction was flagged before the choice was made and the owner
confirmed AWS.

**Rationale:** owner instruction, and the brief lists AWS as part of the stack.

**Note:** "AWS hosts the whole app" is not the same as "AWS is fully managed". Managed RDS,
ALB and CI/CD are all still deferred.

**Reverses if:** cost or latency proves unacceptable, or the EC2 instance turns out to be
underpowered for Compose + Postgres + Node.

---

## D-06 — kerry is out of scope

**Status:** LOCKED (2026-11-17)

`hostinger-kerry` (a separate fleet host) serves no part of this project — not
compute, not proxy, not edge TLS. Its earlier role is withdrawn with D-05.

**Rationale:** consequence of D-05. Keeping kerry as an edge would add a hop and a second
TLS chain for no benefit.

**Reverses if:** the owner wants the domain's TLS to follow the existing
`heurist.online` pattern on kerry. Note that pattern already serves six subdomains there.

---

## D-07 — Domain: `web3.heurist.online`

**Status:** LOCKED (2026-11-17)

Public URL will be `https://web3.heurist.online`.

**Verified 2026-11-17:** `heurist.online` NS = `ns55/ns56.domaincontrol.com` (GoDaddy).
There is **no record** for `web3.heurist.online` and **no wildcard** on the apex, so an A
record must be created. The apex itself has no A record — pre-existing, not ours to fix.

---

## D-08 — Project folder: `PROJECTS/web3_proj/`

**Status:** LOCKED (2026-11-17)

Documents live at `PROJECTS/web3_proj/`. The folder existed empty before this corpus.

**Open sub-point:** whether application source also lives here. Workspace rule 4 says code
is authored on the server, not locally — so on current rules the source lives on EC2 and
this folder stays documentation. Not yet confirmed by the owner.

---

## D-09 — Settlement asset: USDC

**Status:** LOCKED (2026-11-17)

USDC, an ERC-20 stablecoin, rather than ETH.

**Why:** a 7–14 day inspection window priced in ETH exposes both parties to price risk the
contract cannot hedge. Stablecoin removes it.

**Needs:** token contract address for the chosen chain; a decision on who absorbs gas.

---

## D-10 — ORM: Prisma

**Status:** LOCKED (2026-11-17) — Prisma

The `prd` skill's Stack C text names TypeORM; the skill also lists Prisma as an accepted
data mapper. No owner instruction exists.

**Recommendation:** Prisma — better migration ergonomics, typed client, and Pillar X
requires versioned migrations. Do not treat this as decided.

---

## D-11 — Chain: Ethereum Sepolia for the MVP

**Status:** LOCKED (2026-11-17)

The brief says Ethereum. For an MVP that must not spend real money, Sepolia testnet with
test USDC is the natural target; mainnet later.

**Cost note:** Ethereum L1 gas on mainnet is material against a vehicle's price only if many
transactions are needed. This design needs four per sale, so L1 is defensible later — but a
not-final decision.

---

## D-12 — Arbiter: one platform-held key

**Status:** OPEN — recommendation only

A single key held by the operator can refund but cannot release.

**Risk accepted:** if that key leaks, buyers can be refunded en masse but sellers cannot be
robbed. That asymmetry is the mitigation.

**Needs:** who holds the key, where it is stored, and the rotation story.

---

## D-13 — Repository: `github.com/azlanabas`

**Status:** LOCKED (2026-11-17) — repo created, public, corpus pushed

Workspace default for new projects is the personal GitHub account `azlanabas` (per
`WORKSPACE.md` §4). No repo has been created.

---

## D-14 — Jurisdiction / legal position

**Status:** OPEN

Where buyers, sellers and vehicles are located, and therefore which escrow and title rules
apply. Left open deliberately; the brief brief is jurisdiction-agnostic and the MVP can be
built on a testnet without resolving it, but **mainnet requires it**.

---

## D-15 — Runtime model: systemd, no Docker

**Status:** LOCKED (2026-11-17) — **SUPERSEDES the Compose assumption in 02-architecture**

The API runs as a `systemd` service under Node 24, the database is the instance's existing
PostgreSQL 16, and the frontend is a static Vite build served by nginx.

**Rationale:** Docker is not installed on the instance, and the box has ~1.1 GB free RAM while
already running a Next.js app and Postgres. A Docker daemon plus image build is a credible OOM
risk. The host's own established pattern is systemd + local Postgres + nginx.

**Cost accepted:** no container isolation, no `docker compose up` reproducibility, and the
deploy path is more manual. Accepted for an MVP on a shared small instance.

**Reverses if:** the app moves to a larger instance, or a second environment is needed.

---

## D-16 — Stack signed off (core + Web3)

**Status:** LOCKED (2026-11-17)

Owner confirmed the full stack in `architecture.md` §4: NestJS + Vite/React/Tailwind +
PostgreSQL 16 + Prisma + Zod + SIWE; Solidity with **Foundry**; **viem** + **wagmi v2 +
RainbowKit**; OpenZeppelin v5; custom `getLogs` indexer.

On-chain facts verified before sign-off: Sepolia reachable via Alchemy and public RPC; USDC
at `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` reports `symbol()`/`name()` `"USDC"` and
`decimals()` **6**.

**Pinning policy:** no version is invented. Each is read at install and recorded.

---

## D-17 — Buyer-ghosting deadlock

**Status:** LOCKED (2026-11-17) — resolves A-1

If the buyer never confirms after shipment, funds are locked permanently: the arbiter can
refund but not release, so nothing can move the money to the seller.

Options considered:

- **(a)** Timeout auto-release to the seller after N days, with the buyer able to open a
  dispute before it expires. Preserves the refund-only asymmetry. **Recommended.**
- **(b)** Give the arbiter release power after the timeout. Simpler, but weakens the core
  invariant that the arbiter can never pay the seller.
- **(c)** Leave it. Unacceptable — sellers would lose funds to an unresponsive buyer.

**Chosen: (a).** 14 days in `SHIPPED` with no dispute → anyone may call `releaseByTimeout()`
and the seller is paid. `dispute()` by the buyer before expiry freezes the timer and the
arbiter resolves with `refund()` or `releaseToSeller()`.

**Consequence accepted:** the arbiter now holds release power, but only inside a raised
dispute. Invariant 3 is restated accordingly: the arbiter can never pay itself or an arbitrary
address, and can only pay the seller once a dispute exists.

**Known residual:** a buyer may grief a seller by disputing at day 13.99. Accepted for MVP.

**Reverses if:** the escrow model changes to a licensed custodian, where a human arbiter
resolves every case.
