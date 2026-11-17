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
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">{kicker}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-400">{lede}</p>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      {(title || tag) && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
          {tag && <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/80">{tag}</span>}
        </div>
      )}
      <div className="space-y-4 text-sm leading-relaxed text-slate-400">{children}</div>
    </section>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {rows.map((row, i) => (
            <tr key={i} className="bg-slate-900/20 align-top transition hover:bg-slate-900/50">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 ${j === 0 ? "text-slate-200" : "text-slate-400"}`}>{cell}</td>
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
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    slate: "border-slate-600/40 bg-slate-700/20 text-slate-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
      {children}
    </pre>
  );
}

export function Stats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="font-mono text-xl text-white">{s.value}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">{s.label}</p>
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
          <span className="text-emerald-500">▸</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Callout({ tone = "amber", title, children }: { tone?: "amber" | "emerald"; title: string; children: ReactNode }) {
  const cls =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
      : "border-emerald-500/30 bg-emerald-500/5 text-emerald-200";
  return (
    <div className={`rounded-xl border p-4 text-sm leading-relaxed ${cls}`}>
      <p className="mb-1 font-semibold">{title}</p>
      <div className="text-slate-300">{children}</div>
    </div>
  );
}
