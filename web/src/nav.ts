export interface Section {
  id: string;
  label: string;
  group: string;
  blurb: string;
}

export const SECTIONS: Section[] = [
  { id: "overview",   group: "Start",      label: "Overview",            blurb: "What this is and why it exists" },
  { id: "requirements", group: "Start",    label: "Requirement map",     blurb: "Every line of the brief, traced" },

  { id: "web",        group: "Components", label: "Web tier",            blurb: "React, Vite, Tailwind, nginx" },
  { id: "api",        group: "Components", label: "API tier",            blurb: "NestJS, REST, auth, validation" },
  { id: "data",       group: "Components", label: "Data tier",           blurb: "PostgreSQL, Prisma, migrations" },
  { id: "web3",       group: "Components", label: "Web3 layer",          blurb: "Solidity, USDC, Sepolia" },
  { id: "lifecycle",  group: "Components", label: "Escrow lifecycle",    blurb: "Every state and its guards" },

  { id: "demo",       group: "Practice",   label: "Live walkthrough",    blurb: "Drive a real escrow" },
  { id: "explorer",   group: "Practice",   label: "API explorer",        blurb: "Call the live endpoints" },
  { id: "security",   group: "Practice",   label: "Security model",      blurb: "Trust boundaries and threats" },
  { id: "operations", group: "Practice",   label: "Operations",          blurb: "Hosting, TLS, deployment" },
  { id: "roadmap",    group: "Practice",   label: "Status & roadmap",    blurb: "Built, stubbed, next" },
];

export const GROUPS = ["Start", "Components", "Practice"];
