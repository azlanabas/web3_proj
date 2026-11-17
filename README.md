---
title: web3_proj — README
folder: PROJECTS/web3_proj
type: readme
status: planning
updated: 2026-11-17
---

# web3_proj — what this folder is

Planning corpus for an **MVP Web3 vehicle marketplace with non-custodial USDC escrow**.
This folder holds documents only — no application source. Per workspace rule 4, code is
authored on the target host, not here.

**Status: LIVE MVP.** `https://web3.heurist.online` serves a full walkthrough — React UI,
NestJS API, PostgreSQL, and a simulated on-chain escrow. Contract is written and tested but
**not deployed**; settlement is simulated in the API and recorded as chain events.
Facts below were measured **2026-11-17 23:35 GMT+8**.

## Reading order

| File | What it answers |
|---|---|
| [`architecture.md`](architecture.md) | The whole system: stack, data model, contract, API, deployment, trust |
| [`plan.md`](plan.md) · [`todo.md`](todo.md) | Order of work, and the concrete checklist |
| [`docs/01-mvp-scope.md`](docs/01-mvp-scope.md) | What we are building, and explicitly what we are not |
| [`docs/02-architecture.md`](docs/02-architecture.md) | Stack, schema, API, contract interface, AWS topology |
| [`docs/03-decisions.md`](docs/03-decisions.md) | Every decision made so far, with rationale and reversal trigger |
| [`docs/04-gap-register.md`](docs/04-gap-register.md) | What is still unknown, split into blockers vs. launch items |
| [`docs/05-deploy-runbook.md`](docs/05-deploy-runbook.md) | Deployment procedure — **not yet executable** (see blockers) |

Link up: [[PROJECTS/PROJECTS|PROJECTS hub]] · Rules: [[CLAUDE|CLAUDE.md]] · [[WORKSPACE|WORKSPACE.md]]

## Origin

Derived from an inbound LinkedIn message (screenshot on file, sender name withheld)
describing a long-term Web3 vehicle marketplace with crypto escrow
and smart contracts. That message is **inspiration only** — this is our own product, and the
requirements here were reconstructed rather than inherited.

## Current state — measured, not assumed

| Thing | State on 2026-11-17 |
|---|---|
| `PROJECTS/web3_proj/` | Was empty (0 files) at 23:21; this corpus is the first content |
| AWS account | `<AWS_ACCOUNT_ID>`, region `ap-southeast-1` |
| AWS session | 🔴 **EXPIRED** — `aws sts get-caller-identity` fails; no instance facts could be read |
| EC2 instance | ⚠️ **UNVERIFIED** — owner states one exists and should be reused |
| `web3.heurist.online` | 🔴 **No DNS record exists.** No wildcard on `heurist.online` |
| `heurist.online` apex | ⚠️ No A record (pre-existing breakage, not ours to fix) |
| kerry | Healthy, but **out of scope** by decision D-06 |

## Blocker summary

1. AWS session expired — owner must run `aws login`.
2. EC2 instance identity unknown — needs (1) first.
3. Domain A record must point at the EC2 Elastic IP — needs (1) and (2) first.

Nothing in this folder is deployable until those clear. See `docs/04-gap-register.md`.
