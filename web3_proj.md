---
title: web3_proj — hub
folder: PROJECTS/web3_proj
type: hub
status: planning
tags:
  - project
  - web3
  - marketplace
  - escrow
updated: 2026-11-17
---

# web3_proj — hub

> **Status: PLANNING — no code, no repo, no deployment.**
> Facts measured 2026-11-17 23:35 GMT+8.

## One line

A vehicle marketplace where a buyer's USDC is held by a **non-custodial smart contract**
until the vehicle is delivered — the platform never touches the funds.

## Why this shape

Escrow is the product. The marketplace UI is the shopfront. See
[[PROJECTS/web3_proj/docs/01-mvp-scope|01-mvp-scope]] for the reasoning and the state machine.

## Locked decisions

| ID | Decision | Status |
|---|---|---|
| D-01 | Asset model: whole vehicles, not fractional tokens | ✅ locked |
| D-02 | Non-custodial contract escrow | ✅ locked |
| D-03 | Stack: TypeScript / Node / React / Postgres (GDA Stack C) | ✅ locked |
| D-04 | MVP scope, not full platform | ✅ locked |
| D-05 | Hosting: AWS, whole app | ✅ locked |
| D-06 | kerry excluded | ✅ locked |
| D-07 | DNS name `web3.heurist.online` | ✅ locked |
| D-08 | Settlement asset, chain, arbiter model | ⚠️ OPEN |
| D-09 | Jurisdiction / legal position | ⚠️ OPEN |

Full ADR log: [[PROJECTS/web3_proj/docs/03-decisions|03-decisions]].

## Blocked on

AWS session expired → EC2 identity unknown → Elastic IP unknown → **DNS cannot be set**.
This is a single chain; clearing the first link unblocks the rest.

## Where things will live

| Artefact | Destination |
|---|---|
| Application source | EC2 instance, path TBD (needs instance ID) |
| Git remote | `github.com/azlanabas` (workspace default for new projects) |
| Media | AWS S3 |
| Database | PostgreSQL on the EC2 host for MVP (RDS deferred) |
| Public URL | `https://web3.heurist.online` |

## Related

- [[PROJECTS/PROJECTS|PROJECTS hub]] — parent index
- [[INFORMATION/where_things_are/ssh_alias|ssh_alias]] — fleet aliases
- `~/.claude/skills/prd/SKILL.md` — the 11-pillar PRD this must eventually satisfy
- `~/.claude/skills/lockdown/SKILL.md` — operating rules under which this was written

## Caveat

Every date in this tree is load-bearing. AWS facts are marked `UNVERIFIED` because the
session was expired while writing — **do not trust them as live state.** Re-measure.
