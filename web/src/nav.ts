export interface Section {
  id: string;
  label: string;
  group: string;
  blurb: string;
}

export const SECTIONS: Section[] = [
  { id: "overview",     group: "Start",      label: "Overview",          blurb: "What this is and why it exists" },
  { id: "architecture", group: "Start",      label: "Architecture",      blurb: "Every component and how it is built" },
  { id: "requirements", group: "Start",      label: "Requirement map",   blurb: "Every line of the brief, traced" },

  { id: "web",          group: "Components", label: "Web tier",          blurb: "React, Vite, Tailwind, nginx" },
  { id: "api",          group: "Components", label: "API tier",          blurb: "NestJS, REST, auth, validation" },
  { id: "data",         group: "Components", label: "Data tier",         blurb: "PostgreSQL, Prisma, migrations" },

  { id: "fundamentals", group: "Web3",       label: "Ethereum basics",    blurb: "ETH, gas, staking, proofs, sequencer" },
  { id: "sourcemap",    group: "Web3",       label: "Where things live",  blurb: "Source path and runtime address" },
  { id: "chain",        group: "Web3",       label: "Chain & networks",   blurb: "Ethereum, EVM, Sepolia, RPC" },
  { id: "token",        group: "Web3",       label: "USDC & ERC-20",      blurb: "Token, decimals, approvals" },
  { id: "contract",     group: "Web3",       label: "Escrow contract",    blurb: "Solidity, invariants, gas" },
  { id: "transactions", group: "Web3",       label: "Transactions",       blurb: "Sign, mine, receipt, index" },
  { id: "lifecycle",    group: "Web3",       label: "Escrow lifecycle",   blurb: "Every state and its guards" },
  { id: "references",   group: "Web3",       label: "External references", blurb: "Explorers, standards, tooling" },

  { id: "demo",         group: "Practice",   label: "Live walkthrough",  blurb: "Drive a real escrow" },
  { id: "explorer",     group: "Practice",   label: "API explorer",      blurb: "Call the live endpoints" },
  { id: "security",     group: "Practice",   label: "Security model",    blurb: "Trust boundaries and threats" },
  { id: "operations",   group: "Practice",   label: "Operations",        blurb: "Hosting, TLS, deployment" },
  { id: "roadmap",      group: "Practice",   label: "Status & roadmap",  blurb: "Built, deferred, next" },
];

export const GROUPS = ["Start", "Components", "Web3", "Practice"];
