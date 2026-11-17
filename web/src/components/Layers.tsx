const LAYERS = [
  {
    tag: "01",
    name: "Web",
    stack: "React 19 · Vite · Tailwind",
    body:
      "The browser layer. Renders listings, drives the escrow walkthrough and shows every state change as it happens. No wallet is required for the demo — the same page also supports Sign-In With Ethereum for real users.",
    points: ["Static build served by nginx", "Talks only to /api", "No secrets in the bundle"],
  },
  {
    tag: "02",
    name: "Server",
    stack: "NestJS · PostgreSQL 16 · Prisma",
    body:
      "The application server. Owns authentication, validation, persistence and the audit trail. Every request is validated with Zod at the boundary; the database is a read model that can be rebuilt from events.",
    points: ["SIWE + httpOnly session cookie", "REST under /api", "systemd service, 72 MB RSS"],
  },
  {
    tag: "03",
    name: "App",
    stack: "Escrow state machine",
    body:
      "The business logic. An escrow moves through a strict set of states and no illegal transition is possible. A 14-day timer protects the seller from a silent buyer; a dispute freezes that timer for arbitration.",
    points: ["7 states, terminal states are final", "Buyer confirms, arbiter resolves", "Every transition is logged"],
  },
  {
    tag: "04",
    name: "Web3",
    stack: "USDC · Solidity · Ethereum Sepolia",
    body:
      "The settlement layer. Funds sit in a smart contract, not on our balance sheet — the platform is non-custodial and cannot move money on its own. In this MVP the contract call is simulated, but the state machine, events and tx hashes are real records.",
    points: ["Non-custodial by design", "Immutable contract, no proxy", "Chain events mirrored to Postgres"],
  },
];

export function Layers() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">How it works</p>
      <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
        Four layers, one transaction
      </h2>
      <p className="mt-3 max-w-2xl text-slate-400">
        A vehicle sale crosses all four. Each layer has exactly one job, and each hands off a
        narrow contract to the next.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {LAYERS.map((layer) => (
          <article
            key={layer.name}
            className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-emerald-500/40"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs text-slate-600">{layer.tag}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{layer.name}</h3>
            <p className="mt-1 font-mono text-[11px] text-emerald-400/80">{layer.stack}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{layer.body}</p>
            <ul className="mt-4 space-y-1.5">
              {layer.points.map((p) => (
                <li key={p} className="flex gap-2 text-xs text-slate-500">
                  <span className="text-emerald-500">▸</span>
                  {p}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
