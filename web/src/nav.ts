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
  { id: "networks",     group: "3 · The chain", label: "Networks & testnets", blurb: "Every network touched, and its status" },
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
  overview: "You have the shape of it. The next page takes the brief that started this project and traces every line to where it actually lives.",
  requirements: "The brief asked for secure transactions. The next page is what secure means here: seven states, and who is allowed to move between them.",
  lifecycle: "The rules are clear. Now drive them: open an escrow and push it through every state yourself.",
  demo: "You have watched the product work. The next act opens the machine: every file, every module, and the order it was built.",
  architecture: "The inventory is the map. Now the layers, starting at the surface.",
  web: "The browser sends JSON and nothing else. Here is what receives it.",
  api: "Every request ends in a transaction. Here is where the state lives.",
  data: "The schema describes shape. The next page says where each piece physically sits and how to verify it.",
  sourcemap: "The application is mapped. The next act goes down to the chain it settles on, starting with Ethereum itself.",
  fundamentals: "Those are the concepts. Here is the chain actually running.",
  chain: "Networks decide where blocks come from. This page is what a block contains, and why blocks chain.",
  networks: "Networks are where blocks come from. This page is the one this deployment actually uses.",
  blockchain: "Blocks are held together by hashes. So is every transaction, address, selector and login.",
  crypto: "Authentication uses keccak and HMAC. The money uses a token standard, which is next.",
  token: "USDC is the asset. The contract is what holds it and decides when it moves.",
  contract: "The contract defines the rules. A transaction is how one rule is executed.",
  transactions: "You have followed one transaction end to end. These are the tools that made it possible, and the ones that did not.",
  tooling: "Every tool has a primary source. Here they are.",
  references: "The chain is explained. The next act is the evidence that it runs.",
  explorer: "You can call the API. This is what protects it.",
  security: "Security is what was designed. Operations is what keeps it alive.",
  operations: "The system runs. This is what was built, what was deferred, and in what order it comes next.",
  roadmap: "One page holds all of it, and it prints.",
};
