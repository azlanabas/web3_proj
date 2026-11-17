import { GROUPS, SECTIONS } from "../nav";

export function Sidebar({
  route,
  onNavigate,
  open,
  onClose,
  mode,
}: {
  route: string;
  onNavigate: (id: string) => void;
  open: boolean;
  onClose: () => void;
  mode: string;
}) {
  const onChain = mode === "local";
  return (
    <>
      {open && (
        <div onClick={onClose} className="fixed inset-0 z-30 bg-paper backdrop-blur-sm lg:hidden" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 overflow-y-auto border-r border-line bg-paper px-5 py-6 transition-transform lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-sm font-bold text-white">
            ◈
          </span>
          <div>
            <p className="font-mono text-sm leading-none text-ink">web3_proj</p>
            <p className="mt-1 font-mono text-[10px] text-muted">escrow MVP</p>
          </div>
        </div>

        <nav className="mt-8 space-y-6">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                {group}
              </p>
              <ul className="space-y-0.5">
                {SECTIONS.filter((s) => s.group === group).map((s) => {
                  const active = route === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          onNavigate(s.id);
                          onClose();
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left transition ${
                          active
                            ? "bg-accent-soft text-accent"
                            : "text-muted hover:bg-surface hover:text-ink"
                        }`}
                      >
                        <span className="block text-[13px] font-medium">{s.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-faint">
                          {s.blurb}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <a
          href="/system.html"
          className="mt-6 block rounded-xl border border-line p-3 transition hover:border-accent/40"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Blueprint</p>
          <p className="mt-1 text-[12px] font-medium text-ink">Full system map →</p>
          <p className="mt-1 text-[10px] leading-snug text-faint">
            Every component on one printable page
          </p>
        </a>

        <div className="mt-4 rounded-xl border border-line p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Settlement</p>
          <p className={`mt-1 font-mono text-[11px] ${onChain ? "text-accent" : "text-warn"}`}>
            {onChain ? "on-chain" : "simulated"}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-faint">
            {onChain ? "Anvil local EVM · real transactions" : "Contract tested, not deployed."}
          </p>
        </div>
      </aside>
    </>
  );
}
