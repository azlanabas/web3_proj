import { short, usd } from "../lib/api";
import type { ChainEvent, Escrow, EscrowStatus, Listing } from "../types";

const STEPS: { key: EscrowStatus | "SETTLED"; label: string }[] = [
  { key: "CREATED", label: "Created" },
  { key: "FUNDED", label: "Funded" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DISPUTED", label: "Disputed" },
  { key: "SETTLED", label: "Settled" },
];

const TERMINAL: EscrowStatus[] = ["RELEASED", "REFUNDED", "CANCELLED"];

function stepIndex(status: EscrowStatus): number {
  if (status === "CREATED") return 0;
  if (status === "FUNDED") return 1;
  if (status === "SHIPPED") return 2;
  if (status === "DISPUTED") return 3;
  return 4;
}

function StepBar({ status }: { status: EscrowStatus }) {
  const active = stepIndex(status);
  const terminal = TERMINAL.includes(status);
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i < active || (i === active && terminal);
        const current = i === active && !terminal;
        const isSettled = step.key === "SETTLED";
        const tone = done
          ? isSettled && status === "REFUNDED"
            ? "bg-rose-500"
            : "bg-emerald-500"
          : current
            ? "bg-amber-400"
            : "bg-slate-700";
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <div className={`h-1 w-full rounded-full ${tone}`} />
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider ${
                done || current ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  listings: Listing[];
  escrows: Escrow[];
  selected: Escrow | null;
  events: ChainEvent[];
  busy: boolean;
  signedIn: boolean;
  onLogin: () => void;
  onOpen: (listingId: string) => void;
  onSelect: (id: string) => void;
  onAct: (action: string) => void;
  onReset: () => void;
}

export function EscrowPanel(props: Props) {
  const { listings, escrows, selected, events, busy, signedIn } = props;
  const status = selected?.status;

  const canFund = status === "CREATED";
  const canShip = status === "FUNDED";
  const canConfirm = status === "SHIPPED";
  const canDispute = status === "SHIPPED";
  const canTimeTravel = status === "SHIPPED";
  const canTimeoutRelease = status === "SHIPPED";
  const canArbitrate = status === "DISPUTED";
  const canRefund = status === "FUNDED" || status === "SHIPPED" || status === "DISPUTED";

  return (
    <section id="demo" className="border-t border-slate-800/60 bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Live walkthrough
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Run an escrow yourself
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Pick a vehicle, open an escrow, then move it through every state. Each step writes
              a chain event you can inspect on the right.
            </p>
          </div>
          {signedIn ? (
            <button
              onClick={props.onReset}
              disabled={busy}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-200 disabled:opacity-40"
            >
              Reset demo data
            </button>
          ) : (
            <button
              onClick={props.onLogin}
              disabled={busy}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              Start demo session
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-12">
          {/* Vehicles */}
          <div className="lg:col-span-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vehicles ({listings.length})
            </h3>
            <div className="space-y-2">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{l.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {l.year} · {l.mileage.toLocaleString()} km · VIN {l.vin}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-mono text-sm text-emerald-300">
                      ${usd(l.priceUsdc)}
                    </p>
                  </div>
                  <button
                    onClick={() => props.onOpen(l.id)}
                    disabled={busy || !signedIn}
                    className="mt-3 w-full rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-40"
                  >
                    Open escrow
                  </button>
                </div>
              ))}
              {listings.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                  {signedIn ? "No listings yet." : "Start a demo session to load vehicles."}
                </p>
              )}
            </div>
          </div>

          {/* Escrow + state machine */}
          <div className="lg:col-span-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Escrow
            </h3>
            {selected ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-slate-500">
                    escrow #{selected.onchainId}
                  </p>
                  <span className="rounded-full border border-slate-700 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-300">
                    {selected.status}
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl text-white">
                  ${usd(selected.amountUsdc)} <span className="text-sm text-slate-500">USDC</span>
                </p>
                <p className="mt-1 font-mono text-[10px] text-slate-600">
                  chain {selected.chainId} · {short(selected.contractAddress, 8)}
                </p>

                <div className="mt-6">
                  <StepBar status={selected.status} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Action label="Fund escrow" onClick={() => props.onAct("fund")} enabled={canFund} busy={busy} />
                  <Action label="Mark shipped" onClick={() => props.onAct("ship")} enabled={canShip} busy={busy} />
                  <Action label="Confirm delivery" onClick={() => props.onAct("confirm")} enabled={canConfirm} busy={busy} />
                  <Action label="Raise dispute" onClick={() => props.onAct("dispute")} enabled={canDispute} busy={busy} />
                  <Action label="Simulate 14 days" onClick={() => props.onAct("simulate-timeout")} enabled={canTimeTravel} busy={busy} muted />
                  <Action label="Release by timeout" onClick={() => props.onAct("timeout-release")} enabled={canTimeoutRelease} busy={busy} muted />
                  <Action label="Arbiter → seller" onClick={() => props.onAct("release")} enabled={canArbitrate} busy={busy} />
                  <Action label="Arbiter → refund" onClick={() => props.onAct("refund")} enabled={canRefund} busy={busy} />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  Actions are role-gated in production. In demo mode one session may drive every
                  step, the way an operator would.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
                Open an escrow to begin.
                {escrows.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {escrows.slice(0, 4).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => props.onSelect(e.id)}
                        className="block w-full rounded border border-slate-800 px-3 py-1.5 font-mono text-[11px] text-slate-400 hover:border-slate-600"
                      >
                        #{e.onchainId} · {e.status} · ${usd(e.amountUsdc)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event log */}
          <div className="lg:col-span-3">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Chain events
            </h3>
            <div className="h-full rounded-xl border border-slate-800 bg-black/40 p-4">
              {events.length === 0 ? (
                <p className="font-mono text-[11px] text-slate-600">no events yet</p>
              ) : (
                <ul className="space-y-3">
                  {events.map((e) => (
                    <li key={e.id} className="font-mono text-[11px]">
                      <p className="text-emerald-300">{e.eventName}</p>
                      <p className="truncate text-slate-500">{short(e.txHash, 14)}</p>
                      <p className="text-slate-700">block {e.blockNumber}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Action({
  label,
  onClick,
  enabled,
  busy,
  muted,
}: {
  label: string;
  onClick: () => void;
  enabled: boolean;
  busy: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled || busy}
      className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-25 ${
        muted
          ? "border border-slate-700 text-slate-300 hover:border-slate-500"
          : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
      }`}
    >
      {label}
    </button>
  );
}
