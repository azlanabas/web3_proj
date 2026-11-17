import { Badge, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";

const ROWS: [string, string, string][] = [
  ["Long-term Web3 vehicle marketplace", "Listings with make, model, year, VIN and mileage; filtering and detail", "Web · API"],
  ["Secure vehicle transactions", "Funds locked on-chain until the buyer confirms delivery", "App · Web3"],
  ["Cryptocurrency escrow", "USDC held by the contract; the platform never custodies", "Web3"],
  ["Smart contracts", "VehicleEscrow.sol deployed; 23/23 Foundry tests including reentrancy", "Web3"],
  ["Scalable platform", "Stateless API behind nginx; the database is a rebuildable read model", "API · Data"],
  ["Real-world asset plus blockchain", "Physical attributes stored; settlement executed on an EVM", "App · Web3"],
  ["TypeScript / Node.js", "NestJS 12.5.1 on Node 24.21.0, strict TypeScript 5.9.3", "API"],
  ["React", "React 19.3.1 with Vite 8.3.8 and Tailwind 4.3.5", "Web"],
  ["PostgreSQL", "PostgreSQL 16.15, Prisma 6.19.3, money as numeric(20,6)", "Data"],
  ["REST APIs", "23 documented endpoints, Zod-validated, rate limited", "API"],
  ["Docker", "Replaced by systemd on a 2 GB shared host (D-15) — AWS deployment working", "Ops"],
  ["AWS", "EC2 t4g.small in ap-southeast-1, Elastic IP, systemd and nginx", "Ops"],
  ["Git", "Public repository, conventional commits, GitHub Actions CI on every push", "Ops"],
  ["Solidity", "0.8.28 with OpenZeppelin 5.7.0 SafeERC20 and ReentrancyGuard", "Web3"],
  ["Ethereum", "EVM chain id 31337 (local anvil); Sepolia is a configuration swap", "Web3"],
];

export function Requirements() {
  return (
    <Page
      kicker={kickerFor("requirements")}
      title="Every line of the brief, traced"
      lede="The original brief was a recruitment message describing a vehicle marketplace with crypto escrow and smart contracts. This maps each stated requirement onto the component that implements it."
    >
      <Table
        head={["Requirement", "Where it is implemented", "Layer", "Status"]}
        rows={ROWS.map(([req, where, layer]) => [
          req,
          where,
          <span className="font-mono text-[10px] text-muted">{layer}</span>,
          <Badge>Working</Badge>,
        ])}
      />
      <p className="text-xs leading-relaxed text-muted">
        One deliberate deviation from the brief: Docker was replaced with a systemd runtime
        (D-15), because the host has about one gigabyte of free memory and already serves another
        application. Items that are genuinely outside the MVP — public testnet deployment,
        contract audit, image storage — are listed under Roadmap as post-MVP scope rather than
        presented as complete.
      </p>
    </Page>
  );
}
