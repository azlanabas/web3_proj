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
  { id: "overview", group: "Start", label: "Overview", blurb: "Purpose, architecture and current state" },

  { id: "requirements", group: "1 · The product", label: "Requirement map", blurb: "Every line of the brief, traced" },
  { id: "lifecycle",    group: "1 · The product", label: "Escrow lifecycle", blurb: "Every state and its guards" },
  { id: "walkthrough",  group: "1 · The product", label: "Live walkthrough", blurb: "Drive a real escrow" },

  { id: "architecture", group: "2 · How it is built", label: "Architecture", blurb: "Every component and how it is built" },
  { id: "web",          group: "2 · How it is built", label: "Web tier", blurb: "React, Vite, Tailwind, nginx" },
  { id: "api",          group: "2 · How it is built", label: "API tier", blurb: "NestJS, REST, auth, validation" },
  { id: "data",         group: "2 · How it is built", label: "Data tier", blurb: "PostgreSQL, Prisma, migrations" },
  { id: "sourcemap",    group: "2 · How it is built", label: "Where things live", blurb: "Source path and runtime address" },

  { id: "fundamentals", group: "3 · The chain", label: "Ethereum basics", blurb: "ETH, gas, staking, proofs, sequencer" },
  { id: "chain",        group: "3 · The chain", label: "Chain & networks", blurb: "Ethereum, EVM, Sepolia, RPC" },
  { id: "networks",     group: "3 · The chain", label: "Networks & testnets", blurb: "Every network touched, and its status" },
  { id: "blockchain",   group: "3 · The chain", label: "Blockchain & ledger", blurb: "Blocks, chaining, what is distributed" },
  { id: "crypto",       group: "3 · The chain", label: "Hashing & auth", blurb: "keccak, SHA-256, HMAC, SIWE" },
  { id: "token",        group: "3 · The chain", label: "USDC & ERC-20", blurb: "Token, decimals, approvals" },
  { id: "contract",     group: "3 · The chain", label: "Escrow contract", blurb: "Solidity, invariants, gas" },
  { id: "transactions", group: "3 · The chain", label: "Transactions", blurb: "Sign, mine, receipt, index" },
  { id: "tooling",      group: "3 · The chain", label: "Tooling map", blurb: "What is used, what is not, and why" },
  { id: "references",   group: "3 · The chain", label: "External references", blurb: "Explorers, standards, docs" },

  { id: "live",         group: "4 · The evidence", label: "The live build", blurb: "Deployed addresses, real transactions" },
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

export interface Act {
  group: string;
  number: number;
  label: string;
  blurb: string;
}

export const ACTS: Act[] = [
  { group: "1 · The product", number: 1, label: "The product", blurb: "What a buyer and a seller actually do, step by step" },
  { group: "2 · How it is built", number: 2, label: "How it is built", blurb: "Every component, and the order it was assembled" },
  { group: "3 · The chain", number: 3, label: "The chain", blurb: "Ethereum, the ledger, hashing, the escrow contract" },
  { group: "4 · The evidence", number: 4, label: "The evidence", blurb: "Proof it runs, and exactly what is deferred" },
];

export function sectionsOf(group: string): Section[] {
  return SECTIONS.filter((s) => s.group === group);
}

export function actOf(group: string): Act | undefined {
  return ACTS.find((a) => a.group === group);
}

export function firstOfAct(group: string): Section | undefined {
  return sectionsOf(group)[0];
}

/** Kicker derived from position in the nav — never hardcoded, so it cannot drift. */
export function kickerFor(id: string): string {
  const section = SECTIONS.find((s) => s.id === id);
  if (!section) return "";
  if (section.group === "Start") return "Start";
  const act = actOf(section.group);
  const list = sectionsOf(section.group);
  const index = list.findIndex((s) => s.id === id) + 1;
  return `${act?.number ?? 0} · ${act?.label ?? section.group} · ${index} of ${list.length}`;
}

/**
 * The handoff from each section to the next: what the reader just learned and
 * why the next page follows. Written per section so no transition is generic.
 */
export const HANDOFFS: Record<string, string> = {
  overview: "The brief that defined this project, mapped requirement by requirement to where each is implemented.",
  requirements: "Secure transactions depend on a defined set of states. The next page specifies them, and who may move between them.",
  lifecycle: "The state machine can be exercised end to end against the live API.",
  walkthrough: "Act 2 documents the implementation: every file, its role, and the order in which the system was assembled.",
  architecture: "The inventory describes what exists. The following pages examine each tier, beginning at the surface.",
  web: "The browser exchanges JSON with the service. The next page describes that service.",
  api: "Every request resolves to a transaction. The next page describes where state is held.",
  data: "The schema defines shape. The next page records where each component is deployed and how to verify it.",
  sourcemap: "Act 3 concerns the chain that settles this application, beginning with the concepts it relies on.",
  fundamentals: "Those are the concepts; the next page describes the network in use.",
  chain: "Networks determine where blocks are produced. The next page records every network this project has used.",
  networks: "The network is settled. The next page describes the structure of the ledger itself.",
  blockchain: "Blocks are linked by hashes; so are transactions, addresses and sessions.",
  crypto: "Authentication relies on hashing. Settlement relies on a token standard.",
  token: "The token is the asset. The contract determines when it moves.",
  contract: "The contract defines the rules. A transaction executes one.",
  transactions: "A single action has been traced end to end. The next page records the tooling involved.",
  tooling: "Each tool has a primary source; those are listed next.",
  references: "Act 4 presents the evidence that this system runs.",
  live: "The deployment has been verified. The API behind it can be called directly.",
  explorer: "The API is reachable. The next page describes what protects it.",
  security: "Security describes the design. Operations describes how it is maintained.",
  operations: "The system runs in production. The final page records what is complete and what remains.",
};
