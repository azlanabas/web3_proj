import { useEffect, useState } from "react";
import { isAuthenticated, signOut } from "./lib/auth";
import { RouteContext } from "./lib/route";
import { Login } from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { SECTIONS } from "./nav";
import { api } from "./lib/api";
import type { Meta } from "./lib/meta";
import { Walkthrough } from "./pages/Walkthrough";
import { Explorer } from "./pages/Explorer";
import { LiveBuild } from "./pages/LiveBuild";
import { Lifecycle } from "./pages/Lifecycle";
import { Operations } from "./pages/Operations";
import { Overview } from "./pages/Overview";
import { Architecture } from "./pages/Architecture";
import { Requirements } from "./pages/Requirements";
import { Roadmap } from "./pages/Roadmap";
import { Security } from "./pages/Security";
import { Chain } from "./pages/Chain";
import { Crypto } from "./pages/Crypto";
import { References } from "./pages/References";
import { Token } from "./pages/Token";

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
    <div className="min-h-screen bg-paper text-ink">
      <div className="lg:flex">
        <Sidebar
          route={route}
          onNavigate={navigate}
          open={navOpen}
          onClose={() => setNavOpen(false)}
          mode={meta?.chain.mode ?? "simulated"}
        />

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line bg-paper px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNavOpen(true)}
                className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink lg:hidden"
                aria-label="Open navigation"
              >
                ☰
              </button>
              <button
                onClick={() => navigate("overview")}
                className="rounded-md border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition hover:border-accent/40 hover:text-accent"
                aria-label="Back to home"
              >
                ⌂ Home
              </button>
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  {section.group}
                </p>
                <p className="truncate text-sm font-medium text-ink">{section.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 font-mono text-[10px] sm:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-good" : "bg-danger"}`} />
                <span className="text-muted">{online ? "api online" : "api offline"}</span>
              </div>
              <span
                className={`hidden rounded-full border px-2.5 py-1 font-mono text-[10px] sm:inline ${
                  meta?.chain.mode !== "simulated"
                    ? "border-good/40 bg-good-soft text-good"
                    : "border-warn/40 bg-warn-soft text-warn"
                }`}
              >
                {meta?.chain.mode ?? "…"}
              </span>
              <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-muted">
                v{meta?.version ?? "0.1.0"}
              </span>
              <button
                onClick={() => {
                  signOut();
                  setAuthenticated(false);
                }}
                className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-muted transition hover:border-muted hover:text-ink"
              >
                sign out
              </button>
            </div>
          </header>
          <div className="cluster-ticks" aria-hidden="true" />

          {meta && meta.chain.mode !== "sepolia" && meta.chain.mode !== "mainnet" && (
            <div className="border-b border-line bg-surface">
              <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
                <p className="font-mono text-[11px] text-muted">
                  <span className="text-warn">local chain</span> · this deployment settles on anvil.
                  Sepolia is one signed deployment away.
                </p>
                <a
                  href="/deploy.html"
                  className="rounded border border-accent/40 bg-accent-soft px-3 py-1 font-mono text-[11px] text-accent transition hover:border-accent"
                >
                  Deploy to Sepolia →
                </a>
              </div>
            </div>
          )}

          <main className="pb-4">
            <RouteContext.Provider value={route}>
            {route === "overview" && <Overview meta={meta} />}
            {route === "architecture" && <Architecture />}
            {route === "requirements" && <Requirements meta={meta} />}
            {route === "chain" && <Chain meta={meta} />}
            {route === "crypto" && <Crypto />}
            {route === "token" && <Token />}
            {route === "lifecycle" && <Lifecycle />}
            {route === "references" && <References />}
            {route === "walkthrough" && <Walkthrough meta={meta} />}
            {route === "live" && <LiveBuild meta={meta} />}
            {route === "explorer" && <Explorer meta={meta} />}
            {route === "security" && <Security />}
            {route === "operations" && <Operations />}
            {route === "roadmap" && <Roadmap meta={meta} />}
            </RouteContext.Provider>
          </main>

          <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 border-t border-line px-6 py-8">
            {prev ? (
              <button onClick={() => navigate(prev.id)} className="text-left">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {prev.group !== section.group ? `Previous act · ${prev.group}` : "Previous"}
                </p>
                <p className="mt-1 text-sm text-ink">{prev.label}</p>
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button onClick={() => navigate(next.id)} className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {next.group !== section.group ? `Next act · ${next.group}` : "Next"}
                </p>
                <p className="mt-1 text-sm text-accent">{next.label}</p>
              </button>
            ) : (
              <span />
            )}
          </nav>

          <footer className="border-t border-line px-6 py-6 text-center font-mono text-[10px] text-faint">
            web3_proj · AWS ap-southeast-1 · anvil 31337 · on-chain with test USDC
            <span className="mx-2 text-faint">·</span>
            <a
              href="https://github.com/azlanabas/web3_proj"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline-offset-4 transition hover:underline"
            >
              source on GitHub
            </a>
          </footer>
        </div>
      </div>

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-lg backdrop-blur transition hover:border-accent/40 hover:text-accent"
          aria-label="Back to top"
          title="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}
