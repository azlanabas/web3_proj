import { useState } from "react";
import { Badge, Card, Page, Table } from "../components/ui";
import type { Endpoint, Meta } from "../lib/meta";

interface Result {
  path: string;
  status: number;
  ms: number;
  body: string;
}

export function Explorer({ meta }: { meta: Meta | null }) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function call(endpoint: Endpoint): Promise<void> {
    setBusy(endpoint.path);
    setResult(null);
    const started = performance.now();
    try {
      const res = await fetch(endpoint.path, { credentials: "same-origin" });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* leave as text */
      }
      setResult({
        path: endpoint.path,
        status: res.status,
        ms: Math.round(performance.now() - started),
        body: pretty,
      });
    } catch (err) {
      setResult({ path: endpoint.path, status: 0, ms: 0, body: String(err) });
    } finally {
      setBusy(null);
    }
  }

  const endpoints = meta?.endpoints ?? [];

  return (
    <Page
      kicker="Practice"
      title="API explorer"
      lede="The endpoint list on this page is fetched from /api/meta at runtime, so it always matches what the service actually exposes. Read-only routes can be called live from here; mutating routes are shown but disabled."
    >
      <Card title={`Endpoints (${endpoints.length})`} tag="live">
        <Table
          head={["", "Method", "Path", "Auth", "Call"]}
          rows={endpoints.map((e) => [
            <span className="text-xs text-muted">{e.purpose}</span>,
            <span className={`font-mono text-[11px] ${e.method === "GET" ? "text-accent" : "text-warn"}`}>
              {e.method}
            </span>,
            <code className="font-mono text-[11px]">{e.path}</code>,
            <Badge tone="slate">{e.auth}</Badge>,
            e.method === "GET" ? (
              <button
                onClick={() => call(e)}
                disabled={busy === e.path}
                className="rounded border border-accent/40 bg-accent-soft px-2 py-1 font-mono text-[10px] text-accent hover:bg-accent-soft disabled:opacity-40"
              >
                {busy === e.path ? "…" : "call"}
              </button>
            ) : (
              <span className="font-mono text-[10px] text-faint">mutating</span>
            ),
          ])}
        />
      </Card>

      <Card title="Response" tag={result ? `${result.status} · ${result.ms}ms` : "idle"}>
        {result ? (
          <>
            <p className="font-mono text-[11px] text-muted">
              {result.path} → {result.status}
            </p>
            <pre className="max-h-96 overflow-auto rounded-xl border border-line bg-paper p-4 font-mono text-[11px] leading-relaxed text-ink">
              {result.body}
            </pre>
          </>
        ) : (
          <p className="text-muted">Press call on any GET endpoint above.</p>
        )}
      </Card>
    </Page>
  );
}
