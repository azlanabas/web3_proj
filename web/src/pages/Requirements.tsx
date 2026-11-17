import { Badge, Page, Table } from "../components/ui";

type Status = "Working" | "Simulated" | "Tested" | "Replaced";

const ROWS: [string, string, string, Status][] = [
  ["Long-term Web3 vehicle marketplace", "Listings with make, model, year, VIN and mileage; filtering and detail", "Web · API", "Working"],
  ["Secure vehicle transactions", "Funds locked until the buyer confirms delivery", "App · Web3", "Working"],
  ["Cryptocurrency escrow", "USDC held by contract logic; the platform never custodies", "Web3", "Simulated"],
  ["Smart contracts", "VehicleEscrow.sol — 23/23 Foundry tests including reentrancy", "Web3", "Tested"],
  ["Scalable platform", "Stateless API behind nginx; the database is a rebuildable read model", "API · Data", "Working"],
  ["Real-world asset plus blockchain", "Physical attributes stored; settlement modelled on Sepolia", "App · Web3", "Working"],
  ["TypeScript / Node.js", "NestJS 12.5.1 on Node 24.21.0, strict TypeScript 5.9.3", "API", "Working"],
  ["React", "React 19.3.1 with Vite 8.3.8 and Tailwind 4.3.5", "Web", "Working"],
  ["PostgreSQL", "PostgreSQL 16.15, Prisma 6.19.3, money as numeric(20,6)", "Data", "Working"],
  ["REST APIs", "23 documented endpoints, Zod-validated at the boundary", "API", "Working"],
  ["Docker", "Deliberately dropped: 2 GB host shared with another app (D-15)", "Ops", "Replaced"],
  ["AWS", "EC2 t4g.small in ap-southeast-1, Elastic IP, systemd and nginx", "Ops", "Working"],
  ["Git", "Public repository, conventional commits; CI not yet wired", "Ops", "Working"],
  ["Solidity", "0.8.28 with OpenZeppelin 5.7.0 SafeERC20 and ReentrancyGuard", "Web3", "Tested"],
  ["Ethereum", "Sepolia chain id 11155111; USDC six decimals verified on-chain", "Web3", "Working"],
];

const tone: Record<Status, "emerald" | "amber" | "slate"> = {
  Working: "emerald",
  Simulated: "amber",
  Tested: "amber",
  Replaced: "slate",
};

export function Requirements() {
  return (
    <Page
      kicker="Start"
      title="Every line of the brief, and where it actually lives"
      lede="The original brief was a recruitment message describing a vehicle marketplace with crypto escrow and smart contracts. This maps each stated requirement onto the component that implements it, and states honestly how far each one got."
    >
      <Table
        head={["Requirement", "Where it is implemented", "Layer", "Status"]}
        rows={ROWS.map(([req, where, layer, status]) => [
          req,
          where,
          <span className="font-mono text-[10px] text-slate-400">{layer}</span>,
          <Badge tone={tone[status]}>{status}</Badge>,
        ])}
      />
      <p className="text-xs leading-relaxed text-slate-500">
        Two deviations from the brief are deliberate and documented as decisions: Docker was
        replaced with a systemd runtime (D-15) because the host has about one gigabyte of free
        memory and already serves another application, and escrow settlement is simulated (D-19)
        pending a funded testnet key.
      </p>
    </Page>
  );
}
