import { Badge, Card, Code, List, Page, Stats, Table } from "../components/ui";

export function Operations() {
  return (
    <Page
      kicker="Practice · 4 of 5"
      title="Operations"
      lede="Where this actually runs, how it is deployed, and what it costs the host. The constraint that shaped it: a 2 GB instance that is already serving another application."
    >
      <Table
        head={["Component", "Value"]}
        rows={[
          ["Cloud", "AWS, ap-southeast-1 (Singapore)"],
          ["Instance", "t4g.small, arm64, Ubuntu 24.04.4 LTS"],
          ["Addressing", "Elastic IP, so DNS survives stop and start"],
          ["Access", "SSH over Tailscale; port 22 closed to the internet"],
          ["Runtime", "systemd unit, no Docker (decision D-15)"],
          ["Reverse proxy", "nginx 1.24.0, TLS terminated locally"],
          ["Certificates", "Let's Encrypt via certbot, auto-renew, dry-run verified"],
          ["Database", "PostgreSQL 16.15 on localhost"],
          ["Node", "24.21.0"],
        ]}
      />

      <Stats
        items={[
          { value: "70 MB", label: "API resident memory" },
          { value: "1.09 GB", label: "free RAM on the host" },
          { value: "7.9 GB", label: "free disk" },
          { value: "200", label: "co-hosted app still healthy" },
        ]}
      />

      <Card title="Topology" tag="request path">
        <Code>{`browser ──HTTPS──▶ nginx :443  (TLS, static files, /api proxy)
                    │
                    ├── /            → /srv/web3proj/web/dist  (React build)
                    └── /api/*       → 127.0.0.1:8310          (systemd: web3proj-api)
                                            │
                                            └── 127.0.0.1:5432 PostgreSQL`}</Code>
      </Card>

      <Card title="Deployment" tag="repeatable">
        <List
          items={[
            "Pull the source on the host and build the API with tsc.",
            "Build the frontend with Vite; the output replaces the served dist directory.",
            "Restart the systemd unit; nginx reloads only when its config changes.",
            "Verify with /api/health, the TLS certificate and an unauthenticated page fetch.",
          ]}
        />
      </Card>

      <Card title="Operational controls" tag="implemented">
        <List
          items={[
            "Nightly pg_dump at 03:00 GMT+8 (19:00 UTC), compressed, seven-day rotation.",
            "Journald capped at 200 MB; nginx logs handled by logrotate.",
            "GitHub Actions CI on every push: Foundry tests, API typecheck, web build.",
            "systemd supervises both the API and the chain, restarting on failure.",
            "TLS renewal verified with a certbot dry run for both certificates.",
          ]}
        />
        <p className="flex flex-wrap gap-2 pt-1">
          <Badge>Backups</Badge>
          <Badge>Log rotation</Badge>
          <Badge>CI</Badge>
          <Badge>Auto-restart</Badge>
        </p>
      </Card>
    </Page>
  );
}
