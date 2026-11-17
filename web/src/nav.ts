export interface Section {
  id: string;
  label: string;
  group: string;
  blurb: string;
  href?: string;
}

export const SECTIONS: Section[] = [
  { id: "overview",   group: "Start",           label: "Overview",          blurb: "Purpose, live transactions, entry points" },
  { id: "live",       group: "Start",           label: "Transactions",      blurb: "The live chain, block by block" },
  { id: "walkthrough",group: "Start",           label: "Run an escrow",     blurb: "The lifecycle against the live API" },

  { id: "requirements",group: "1 · Scope",      label: "Requirements",      blurb: "The brief, mapped to implementation" },
  { id: "lifecycle",  group: "1 · Scope",       label: "Escrow",            blurb: "States, contract rules, invariants" },

  { id: "architecture",group: "2 · Build",      label: "Architecture",      blurb: "Every component and where it lives" },
  { id: "chain",      group: "2 · Build",       label: "Chain",             blurb: "Networks, blocks, what is distributed" },
  { id: "crypto",     group: "2 · Build",       label: "Hashing & auth",    blurb: "keccak, SHA-256, HMAC, SIWE" },
  { id: "token",      group: "2 · Build",       label: "Token",             blurb: "USDC, decimals, approvals" },

  { id: "explorer",   group: "3 · Operate",     label: "API explorer",      blurb: "Call the live endpoints" },
  { id: "security",   group: "3 · Operate",     label: "Security",          blurb: "Trust boundaries and controls" },
  { id: "operations", group: "3 · Operate",     label: "Operations",        blurb: "Hosting, TLS, backups, CI" },
  { id: "roadmap",    group: "3 · Operate",     label: "Status",            blurb: "Complete, deferred, next" },
  { id: "references", group: "3 · Operate",     label: "References",        blurb: "Tooling, standards, explorers" },

  { id: "blueprint",  group: "Reference",       label: "System blueprint",  blurb: "Printable one-page map", href: "/system.html" },
];

export const GROUPS = ["Start", "1 · Scope", "2 · Build", "3 · Operate", "Reference"];

export interface Act { group: string; number: number; label: string; blurb: string }
export const ACTS: Act[] = [
  { group: "1 · Scope",   number: 1, label: "Scope",    blurb: "What was asked, what the states are, what the contract enforces" },
  { group: "2 · Build",   number: 2, label: "Build",    blurb: "Components, the chain, hashing and the settlement token" },
  { group: "3 · Operate", number: 3, label: "Operate",  blurb: "The API, security, operations and what remains" },
];

export function sectionsOf(group: string): Section[] { return SECTIONS.filter((s) => s.group === group); }
export function actOf(group: string): Act | undefined { return ACTS.find((a) => a.group === group); }
export function firstOfAct(group: string): Section | undefined { return sectionsOf(group)[0]; }

export function kickerFor(id: string): string {
  const section = SECTIONS.find((s) => s.id === id);
  if (!section) return "";
  if (!section.group.match(/^\d/)) return section.group;
  const act = actOf(section.group);
  const list = sectionsOf(section.group);
  const index = list.findIndex((s) => s.id === id) + 1;
  return `${act?.number ?? 0} · ${act?.label ?? section.group} · ${index} of ${list.length}`;
}

export const HANDOFFS: Record<string, string> = {
  overview: "The live feed on this page is the evidence. The full transaction record follows.",
  live: "Those transactions are produced by this interface. The escrow can be run directly against it.",
  walkthrough: "The escrow states are defined by the contract; the next page specifies them.",
  requirements: "The brief requires secure transactions. The states that guarantee them follow.",
  lifecycle: "The states are enforced in Solidity; the next page documents the contract.",
  contract: "The contract runs on a specific network. The build section begins with the architecture.",
  architecture: "The inventory describes what exists; the next page describes the chain that settles it.",
  chain: "The chain signs with hashes; the next page documents where they are used.",
  crypto: "Authentication uses hashing; settlement uses a token standard.",
  token: "The token is the asset; the contract determines when it moves. Operations follows.",
  explorer: "The API is reachable; the next page describes what protects it.",
  security: "Security describes the design; operations describes how it is maintained.",
  operations: "The system runs in production; the final page records what remains.",
  roadmap: "Reference material: the tooling and primary sources behind this build.",
  references: "",
};
