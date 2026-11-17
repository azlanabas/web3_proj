---
title: 01 — MVP scope
project: web3_proj
status: draft
updated: 2026-11-17
---

# 01 — MVP scope

*Written 2026-11-17 GMT+8. Nothing here is implemented.*

## Product statement

A marketplace where private sellers list vehicles and buyers pay in USDC, with the funds
locked in a smart contract and released only when the buyer confirms delivery. If delivery
fails, an arbiter can refund the buyer.

The platform is a **venue and an arbitration desk** — not a custodian. It never holds user
funds and therefore does not act as a money transmitter in the MVP design. That is the
single most important constraint in this document; every feature below is subordinate to it.

## Actors

| Actor | Can do | Notes |
|---|---|---|
| Visitor | Browse listings | No wallet needed |
| Seller | Create listing, mark shipped, receive funds | Authenticated by wallet signature |
| Buyer | Fund escrow, confirm delivery, trigger release | Authenticated by wallet signature |
| Arbiter | Refund a funded escrow | **Platform-held key in MVP** — see trust model |
| Operator | View all escrows, read chain events | Admin panel, read-mostly |

## Escrow state machine

```
                 seller creates listing
                            │
                       ┌────▼────┐
                       │ LISTED  │
                       └────┬────┘
                            │ buyer opens escrow (on-chain)
                       ┌────▼─────┐
                       │ CREATED  │
                       └────┬─────┘
                            │ buyer deposits USDC
                       ┌────▼─────┐
                       │  FUNDED  │
                       └────┬─────┘
                            │ seller marks shipped
                       ┌────▼────────┐
                       │ IN_TRANSIT  │
                       └────┬────────┘
              buyer confirms │  │ arbiter rules delivery failed
                    ┌────────▼┐ └──────────┐
               ┌────▼────┐            ┌────▼─────┐
               │ RELEASED│            │ REFUNDED │
               └─────────┘            └──────────┘
                  (seller paid)         (buyer repaid)

  CANCELLED: reachable from CREATED only, by seller or buyer, before FUNDED.
  DISPUTED : flag set on IN_TRANSIT when either party raises a problem;
             resolution = RELEASED or REFUNDED by the arbiter.
```

**Terminal states:** `RELEASED`, `REFUNDED`, `CANCELLED`. There is no transition out of them.

**Amended 2026-11-17 (D-17):** `IN_TRANSIT` gains a 14-day timer. If it expires with no
dispute, anyone may release funds to the seller. The buyer may raise `DISPUTED` before expiry,
which freezes the timer and hands the decision to the arbiter (`refund` or `releaseToSeller`).

## In scope

| # | Feature | Acceptance criterion |
|---|---|---|
| 1 | Browse listings | Grid + filter by make/year/price; paginated; no wallet required |
| 2 | Listing detail | Photos, VIN, mileage, price in USDC, seller address |
| 3 | Wallet auth (SIWE) | Sign-In With Ethereum; session cookie; logout |
| 4 | Create listing | Seller only; draft → published; images to S3 |
| 5 | Create escrow | Buyer signs `createEscrow`; DB row mirrors chain |
| 6 | Fund escrow | Buyer transfers USDC; contract emits `Funded` |
| 7 | Ship + confirm | Seller marks shipped; buyer confirms delivery |
| 8 | Release / refund | `release` pays seller; `refund` (arbiter) repays buyer |
| 9 | Admin escrow list | Operator sees all escrows + chain tx hashes |
| 10 | Health endpoint | `GET /api/health` → `{"status":"ok"}` |

## Out of scope — and why

| Excluded | Reason |
|---|---|
| KYC / AML | Requires vendor contract and legal opinion; not needed for a testnet MVP |
| Fiat on/off-ramp | Licensing exposure; USDC only |
| Fractional / RWA tokens | Almost certainly a security; separate legal track |
| Multi-chain | One chain, one contract |
| Dispute UI / evidence upload | MVP uses arbiter judgement with no in-app evidence flow |
| DMV / lien / title integration | Jurisdiction undecided (D-09); no API to integrate yet |
| Auctions / bidding | Adds a second settlement model |
| Email / notifications | Not required to prove the escrow loop |
| Mobile app | Responsive web is sufficient |
| Vehicle inspection or logistics | Off-platform, by contract, for MVP |
| Fiat invoicing / VAT | Out of scope until jurisdiction fixed |

## Trust model — stated plainly

The MVP has **one privileged actor**: the arbiter key. It can refund but **cannot** release
to the seller, and it cannot move funds anywhere except back to the recorded buyer. That
asymmetry is deliberate — it caps the damage a compromised arbiter key can do.

What the contract **cannot** verify: that a vehicle exists, that it was delivered, or that
the title is clean. The buyer's confirmation is the delivery oracle. This is a real trust
assumption and must not be described to users as trustless.

## Definition of done for the MVP

1. A seller can list a vehicle and a buyer can fund escrow, **on a public testnet**.
2. Release moves USDC to the seller; refund returns it to the buyer.
3. `https://web3.heurist.online` serves the app over valid TLS.
4. Chain events reconcile to the database — a restart does not lose escrow state.
5. A recorded end-to-end run exists (tx hashes) proving 1–2.

## Regulatory caveat

Jurisdiction is **OPEN** (D-09). If the platform ever takes custody, accepts fiat, or
guarantees delivery, the analysis changes and this document is void. Review before mainnet.
