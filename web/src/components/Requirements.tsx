const ROWS = [
  ["Long-term Web3 vehicle marketplace", "Listings, detail, filters — live against PostgreSQL", "Web · Server"],
  ["Secure vehicle transactions", "Escrow locks funds until delivery is confirmed", "App · Web3"],
  ["Cryptocurrency escrow", "USDC held by contract, never by the platform", "Web3"],
  ["Smart contracts", "VehicleEscrow.sol — 23/23 Foundry tests, incl. reentrancy", "Web3"],
  ["Scalable platform", "Stateless API behind nginx; DB is a rebuildable read model", "Server"],
  ["Real-world asset + blockchain", "VIN, mileage, year recorded; settlement on Sepolia", "App · Web3"],
  ["TypeScript / Node.js", "NestJS 12 on Node 24", "Server"],
  ["React", "React 19 + Vite + Tailwind", "Web"],
  ["PostgreSQL", "PostgreSQL 16, numeric(20,6) for money", "Server"],
  ["REST APIs", "Documented /api surface, Zod-validated", "Server"],
  ["Docker / AWS", "AWS EC2 + systemd + nginx (Docker intentionally dropped)", "Server"],
  ["Solidity / Ethereum", "Solidity 0.8.28, Sepolia chain id 11155111", "Web3"],
];

export function Requirements() {
  return (
    <section id="requirements" className="border-t border-slate-800/60 bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Requirement coverage
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Every line of the brief, mapped
        </h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          Left: what was asked. Middle: where it exists. Right: which layer owns it.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Requirement</th>
                <th className="px-5 py-3 font-medium">Where it lives</th>
                <th className="px-5 py-3 font-medium">Layer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {ROWS.map(([req, where, layer]) => (
                <tr key={req} className="bg-slate-900/30 transition hover:bg-slate-900/60">
                  <td className="px-5 py-3 text-slate-200">{req}</td>
                  <td className="px-5 py-3 text-slate-400">{where}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-300">
                      {layer}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Escrow settlement is simulated in this MVP: the contract is written and tested, but
          not yet deployed to Sepolia. Every state, event and hash you see below is recorded in
          PostgreSQL exactly as a live deployment would record it.
        </p>
      </div>
    </section>
  );
}
