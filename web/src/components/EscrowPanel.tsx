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
            ? "bg-danger"
            : "bg-accent"
          : current
            ? "bg-warn"
            : "bg-line";
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <div className={`h-1 w-full rounded-full ${tone}`} />
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider ${
                done || current ? "text-ink" : "text-faint"
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
  canTimeTravel?: boolean;
  viewAs?: "buyer" | "seller" | "arbiter";
}

export function EscrowPanel(props: Props) {
  const { listings, escrows, selected, events, busy, signedIn } = props;
  const canTimeTravel = props.canTimeTravel ?? false;
  const viewAs = props.viewAs ?? "buyer";
  const status = selected?.status;

  const canFund = status === "CREATED";
  const canShip = status === "FUNDED";
  const canConfirm = status === "SHIPPED";
  const canDispute = status === "SHIPPED";
  const showTimeTravel = status === "SHIPPED" && canTimeTravel;
  const canTimeoutRelease = status === "SHIPPED";
  const canArbitrate = status === "DISPUTED";
  const canRefund = status === "FUNDED" || status === "SHIPPED" || status === "DISPUTED";

  return (
    <section id="walkthrough" className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Live walkthrough
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
              Run an escrow yourself
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Pick a vehicle, open an escrow, then move it through every state. Each step writes
              a chain event recorded on the right.
            </p>
          </div>
          {signedIn ? (
            <button
              onClick={props.onReset}
              disabled={busy}
              className="rounded-lg border border-line px-3 py-2 text-xs text-muted transition hover:border-muted hover:text-ink disabled:opacity-40"
            >
              Reset session
            </button>
          ) : (
            <button
              onClick={props.onLogin}
              disabled={busy}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-strong disabled:opacity-50"
            >
              Start session
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-12">
          {/* Vehicles */}
          <div className="lg:col-span-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Vehicles ({listings.length})
            </h3>
            <div className="space-y-2">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{l.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {l.year} · {l.mileage.toLocaleString()} km · VIN {l.vin}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-mono text-sm text-accent">
                      ${usd(l.priceUsdc)}
                    </p>
                  </div>
                  <button
                    onClick={() => props.onOpen(l.id)}
                    disabled={busy || !signedIn}
                    className="mt-3 w-full rounded-lg border border-accent/40 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft disabled:opacity-40"
                  >
                    Open escrow
                  </button>
                </div>
              ))}
              {listings.length === 0 && (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
                  {signedIn ? "No listings yet." : "Start a session to load vehicles."}
                </p>
              )}
            </div>
          </div>

          {/* Escrow + state machine */}
          <div className="lg:col-span-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Escrow
            </h3>
            {selected ? (
              <div className="rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-muted">
                    escrow #{selected.onchainId}
                  </p>
                  <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink">
                    {selected.status}
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl text-ink">
                  ${usd(selected.amountUsdc)} <span className="text-sm text-muted">USDC</span>
                </p>
                <p className="mt-1 font-mono text-[10px] text-faint">
                  chain {selected.chainId} · {short(selected.contractAddress, 8)}
                </p>

                <div className="mt-6">
                  <StepBar status={selected.status} />
                  <div className="cluster-ticks mt-2" aria-hidden="true" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {viewAs === "buyer" && (
                    <>
                      <Action label="Fund escrow" onClick={() => props.onAct("fund")} enabled={canFund} busy={busy} />
                      <Action label="Confirm delivery" onClick={() => props.onAct("confirm")} enabled={canConfirm} busy={busy} />
                      <Action label="Raise dispute" onClick={() => props.onAct("dispute")} enabled={canDispute} busy={busy} />
                    </>
                  )}
                  {viewAs === "seller" && (
                    <Action label="Mark shipped" onClick={() => props.onAct("ship")} enabled={canShip} busy={busy} />
                  )}
                  {viewAs === "arbiter" && (
                    <>
                      <Action label="Release to seller" onClick={() => props.onAct("release")} enabled={canArbitrate} busy={busy} />
                      <Action label="Refund buyer" onClick={() => props.onAct("refund")} enabled={canRefund} busy={busy} />
                    </>
                  )}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                  Actions are role-gated in production. One session may drive every step, the way an
                  operator would.
                </p>
                {!canTimeTravel && (
                  <p className="mt-2 text-[11px] leading-relaxed text-warn">
                    Time-travel is disabled: this deployment settles on a public chain, where the
                    14-day window must actually elapse.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
                Open an escrow to begin.
                {escrows.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {escrows.slice(0, 4).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => props.onSelect(e.id)}
                        className="block w-full rounded border border-line px-3 py-1.5 font-mono text-[11px] text-muted hover:border-line"
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
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Chain events
            </h3>
            <div className="h-full rounded-xl border border-line bg-paper p-4">
              {events.length === 0 ? (
                <p className="font-mono text-[11px] text-faint">no events yet</p>
              ) : (
                <ul className="space-y-3">
                  {events.map((e) => (
                    <li key={e.id} className="font-mono text-[11px]">
                      <p className="text-accent">{e.eventName}</p>
                      <p className="truncate text-muted">{short(e.txHash, 14)}</p>
                      <p className="text-faint">block {e.blockNumber}</p>
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
          ? "border border-line text-ink hover:border-muted"
          : "bg-accent text-paper hover:bg-accent-strong"
      }`}
    >
      {label}
    </button>
  );
}
