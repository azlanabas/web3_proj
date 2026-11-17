import { useEffect, useState } from "react";
import { isAuthenticated, signOut } from "./lib/auth";
import { Login } from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { SECTIONS } from "./nav";
import { api } from "./lib/api";
import type { Meta } from "./lib/meta";
import { Api } from "./pages/Api";
import { Data } from "./pages/Data";
import { Demo } from "./pages/Demo";
import { Explorer } from "./pages/Explorer";
import { Lifecycle } from "./pages/Lifecycle";
import { Operations } from "./pages/Operations";
import { Overview } from "./pages/Overview";
import { Requirements } from "./pages/Requirements";
import { Roadmap } from "./pages/Roadmap";
import { Security } from "./pages/Security";
import { Web } from "./pages/Web";
import { Chain } from "./pages/Chain";
import { Token } from "./pages/Token";
import { Contract } from "./pages/Contract";
import { Transactions } from "./pages/Transactions";

function currentRoute(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return SECTIONS.some((s) => s.id === hash) ? hash : "overview";
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(() => isAuthenticated());
  const [route, setRoute] = useState<string>(currentRoute);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [online, setOnline] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    api.health().then(() => setOnline(true)).catch(() => setOnline(false));
    fetch("/api/meta")
      .then((r) => r.json())
      .then((m: Meta) => setMeta(m))
      .catch(() => undefined);
  }, []);

  function navigate(id: string): void {
    window.location.hash = `#/${id}`;
    setRoute(id);
    window.scrollTo({ top: 0 });
  }

  if (!authenticated) {
    return <Login onSuccess={() => setAuthenticated(true)} />;
  }

  const index = SECTIONS.findIndex((s) => s.id === route);
  const section = SECTIONS[index] ?? SECTIONS[0];
  const prev = SECTIONS[index - 1];
  const next = SECTIONS[index + 1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="lg:flex">
        <Sidebar
          route={route}
          onNavigate={navigate}
          open={navOpen}
          onClose={() => setNavOpen(false)}
          mode={meta?.web3.chainMode ?? "simulated"}
        />

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-800/60 bg-slate-950/85 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNavOpen(true)}
                className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 lg:hidden"
                aria-label="Open navigation"
              >
                ☰
              </button>
              <button
                onClick={() => navigate("overview")}
                className="rounded-md border border-slate-700 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 transition hover:border-emerald-500/50 hover:text-emerald-300"
                aria-label="Back to home"
              >
                ⌂ Home
              </button>
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
                  {section.group}
                </p>
                <p className="truncate text-sm font-medium text-slate-200">{section.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 font-mono text-[10px] sm:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-rose-500"}`} />
                <span className="text-slate-500">{online ? "api online" : "api offline"}</span>
              </div>
              <span
                className={`hidden rounded-full border px-2.5 py-1 font-mono text-[10px] sm:inline ${
                  meta?.web3.chainMode === "local"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                {meta?.web3.chainMode === "local" ? "on-chain" : "simulated"}
              </span>
              <span className="rounded-full border border-slate-700 px-2.5 py-1 font-mono text-[10px] text-slate-400">
                v{meta?.version ?? "0.1.0"}
              </span>
              <button
                onClick={() => {
                  signOut();
                  setAuthenticated(false);
                }}
                className="rounded-full border border-slate-700 px-2.5 py-1 font-mono text-[10px] text-slate-500 transition hover:border-slate-500 hover:text-slate-300"
              >
                sign out
              </button>
            </div>
          </header>

          <main className="pb-4">
            {route === "overview" && <Overview />}
            {route === "requirements" && <Requirements />}
            {route === "web" && <Web />}
            {route === "api" && <Api meta={meta} />}
            {route === "data" && <Data />}
            {route === "chain" && <Chain />}
            {route === "token" && <Token />}
            {route === "contract" && <Contract />}
            {route === "transactions" && <Transactions />}
            {route === "lifecycle" && <Lifecycle />}
            {route === "demo" && <Demo />}
            {route === "explorer" && <Explorer meta={meta} />}
            {route === "security" && <Security />}
            {route === "operations" && <Operations />}
            {route === "roadmap" && <Roadmap />}
          </main>

          <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 border-t border-slate-800/60 px-6 py-8">
            {prev ? (
              <button onClick={() => navigate(prev.id)} className="text-left">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Previous</p>
                <p className="mt-1 text-sm text-slate-300 hover:text-white">{prev.label}</p>
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button onClick={() => navigate(next.id)} className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Next</p>
                <p className="mt-1 text-sm text-emerald-300 hover:text-emerald-200">{next.label}</p>
              </button>
            ) : (
              <span />
            )}
          </nav>

          <footer className="border-t border-slate-800/60 px-6 py-6 text-center font-mono text-[10px] text-slate-600">
            web3_proj · AWS ap-southeast-1 · anvil 31337 · on-chain with test USDC
          </footer>
        </div>
      </div>

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-300 shadow-lg backdrop-blur transition hover:border-emerald-500/60 hover:text-emerald-300"
          aria-label="Back to top"
          title="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}
