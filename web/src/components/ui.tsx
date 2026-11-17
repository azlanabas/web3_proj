import type { ReactNode } from "react";

export function Page({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{kicker}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-muted">{lede}</p>
      <div className="mt-10 space-y-8">{children}</div>
    </article>
  );
}

export function Card({
  title,
  tag,
  children,
}: {
  title?: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      {(title || tag) && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
          {tag && <span className="font-mono text-[10px] uppercase tracking-wider text-accent/80">{tag}</span>}
        </div>
      )}
      <div className="space-y-4 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={i} className="bg-surface align-top transition hover:bg-surface">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 ${j === 0 ? "text-ink" : "text-muted"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ children, tone = "emerald" }: { children: ReactNode; tone?: "emerald" | "amber" | "slate" | "rose" }) {
  const tones = {
    emerald: "border-good/40 bg-good-soft text-good",
    amber: "border-warn/40 bg-warn-soft text-warn",
    slate: "border-line bg-line text-ink",
    rose: "border-danger/40 bg-danger-soft text-danger",
  };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-line bg-paper p-4 font-mono text-[11px] leading-relaxed text-ink">
      {children}
    </pre>
  );
}

export function Stats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-xl border border-line bg-surface p-4">
          <p className="font-mono text-xl tracking-tight text-ink">{s.value}</p>
          <div className="cluster-ticks mb-2 mt-2" aria-hidden="true" />
          <p className="text-[11px] leading-snug text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function List({ items, mono }: { items: ReactNode[]; mono?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={`flex gap-2 ${mono ? "font-mono text-[11px]" : ""}`}>
          <span className="text-accent">▸</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Callout({ tone = "emerald", title, children }: { tone?: "amber" | "emerald" | "slate"; title: string; children: ReactNode }) {
  const cls =
    tone === "amber"
      ? "border-warn/40 bg-warn-soft text-warn"
      : tone === "slate"
        ? "border-line bg-surface text-ink"
        : "border-good/40 bg-good-soft text-good";
  return (
    <div className={`rounded-xl border p-4 text-sm leading-relaxed ${cls}`}>
      <p className="mb-1 font-semibold">{title}</p>
      <div className="text-ink">{children}</div>
    </div>
  );
}
