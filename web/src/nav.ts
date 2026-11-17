export interface Section {
  id: string;
  label: string;
  group: string;
  blurb: string;
  /** Set for a standalone document rather than an in-app route. */
  href?: string;
}

/**
 * Ordered as a narrative: what it is, how a sale works, how it is built,
 * then the chain that settles it, then the evidence that it runs.
 */
export const SECTIONS: Section[] = [
  { id: "overview", group: "Start", label: "Overview", blurb: "Why this exists, in one page" },

  { id: "requirements", group: "1 · The product", label: "Requirement map", blurb: "Every line of the brief, traced" },
  { id: "lifecycle",    group: "1 · The product", label: "Escrow lifecycle", blurb: "Every state and its guards" },
  { id: "demo",         group: "1 · The product", label: "Live walkthrough", blurb: "Drive a real escrow" },

  { id: "architecture", group: "2 · How it is built", label: "Architecture", blurb: "Every component and how it is built" },
  { id: "web",          group: "2 · How it is built", label: "Web tier", blurb: "React, Vite, Tailwind, nginx" },
  { id: "api",          group: "2 · How it is built", label: "API tier", blurb: "NestJS, REST, auth, validation" },
  { id: "data",         group: "2 · How it is built", label: "Data tier", blurb: "PostgreSQL, Prisma, migrations" },
  { id: "sourcemap",    group: "2 · How it is built", label: "Where things live", blurb: "Source path and runtime address" },

  { id: "fundamentals", group: "3 · The chain", label: "Ethereum basics", blurb: "ETH, gas, staking, proofs, sequencer" },
  { id: "chain",        group: "3 · The chain", label: "Chain & networks", blurb: "Ethereum, EVM, Sepolia, RPC" },
  { id: "blockchain",   group: "3 · The chain", label: "Blockchain & ledger", blurb: "Blocks, chaining, what is distributed" },
  { id: "crypto",       group: "3 · The chain", label: "Hashing & auth", blurb: "keccak, SHA-256, HMAC, SIWE" },
  { id: "token",        group: "3 · The chain", label: "USDC & ERC-20", blurb: "Token, decimals, approvals" },
  { id: "contract",     group: "3 · The chain", label: "Escrow contract", blurb: "Solidity, invariants, gas" },
  { id: "transactions", group: "3 · The chain", label: "Transactions", blurb: "Sign, mine, receipt, index" },
  { id: "tooling",      group: "3 · The chain", label: "Tooling map", blurb: "What is used, what is not, and why" },
  { id: "references",   group: "3 · The chain", label: "External references", blurb: "Explorers, standards, docs" },

  { id: "explorer",     group: "4 · The evidence", label: "API explorer", blurb: "Call the live endpoints" },
  { id: "security",     group: "4 · The evidence", label: "Security model", blurb: "Trust boundaries and threats" },
  { id: "operations",   group: "4 · The evidence", label: "Operations", blurb: "Hosting, TLS, backups, CI" },
  { id: "roadmap",      group: "4 · The evidence", label: "Status & roadmap", blurb: "Built, deferred, next" },
  { id: "blueprint",    group: "4 · The evidence", label: "System blueprint", blurb: "Printable one-page map", href: "/system.html" },
];

export const GROUPS = [
  "Start",
  "1 · The product",
  "2 · How it is built",
  "3 · The chain",
  "4 · The evidence",
];
