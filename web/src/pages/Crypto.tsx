import { Callout, Card, Code, List, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";

export function Crypto() {
  return (
    <Page
      kicker={kickerFor("crypto")}
      title="Hashing and authentication"
      lede="Where each hash is actually used — keccak on-chain, SHA-256 for the access gate, HMAC for the session — and the two completely separate authentication systems in this app."
    >
      <Card title="Every hash in the system" tag="one table, no hand-waving">
        <Table
          head={["Hash", "Algorithm", "Used for", "Where"]}
          rows={[
            ["Block hash", "keccak-256", "Linking blocks via parentHash", "anvil"],
            ["Transaction hash", "keccak-256", "Identity of a signed transaction", "viem / chain"],
            ["Address derivation", "keccak-256", "Last 20 bytes of the public-key hash", "key → address"],
            ["Function selector", "keccak-256", "First 4 bytes of the signature", "0xca1d209d = fund(uint256)"],
            ["Event topic0", "keccak-256", "Identifies the event type in a log", "0xc4c14883… = Funded(uint256)"],
            ["listingId", "keccak-256", "UUID string → bytes32 for the contract", "escrow.service.ts"],
            ["Session cookie", "HMAC-SHA256", "Signs the session payload", "auth/session.ts"],
            ["Access password", "SHA-256", "Comparing the entry credential", "web/src/lib/auth.ts"],
          ]}
        />
        <p className="text-xs">
          keccak-256 is Ethereum&rsquo;s hash. It is <em>not</em> the same as SHA-256 — different
          padding and different constants — which is why <code className="font-mono text-[11px]">cast keccak</code>{" "}
          and <code className="font-mono text-[11px]">sha256sum</code> give different outputs for
          the same input.
        </p>
      </Card>

      <Card title="Selectors, in real values" tag="measured">
        <Code>{`cast sig "fund(uint256)"        → 0xca1d209d      first 4 bytes of the function hash
cast keccak "Funded(uint256)"     → 0xc4c14883…     event topic0
cast keccak "EscrowCreated(...)"  → 0x3465acef…     event topic0
cast keccak "<listing-uuid>"      → 0x088271b7…     bytes32 passed to createEscrow`}</Code>
        <p>
          A transaction&rsquo;s <code className="font-mono text-[11px]">input</code> begins with the
          selector. A real fund transaction in this database has input{" "}
          <code className="font-mono text-[11px]">0xca1d209d…</code>, which is how the contract knows
          which function to run before it reads any argument.
        </p>
      </Card>

      <Card title="Authentication system 1 — SIWE (the real one)" tag="EIP-4361">
        <Code>{`1. GET  /api/auth/siwe/nonce
   server: random 16 bytes → hex, stored in Postgres, 5 min TTL

2. client builds an EIP-4361 message:
   "web3.heurist.online wants you to sign in with your Ethereum account:
    0x…  Nonce: <nonce>  Issued At: …  Chain ID: 11155111"

3. client signs it with their wallet key  →  secp256k1 signature (r, s, v)

4. POST /api/auth/siwe/verify { message, signature }
   server: ecrecover(message, signature) → address
           check domain == SIWE_DOMAIN
           check nonce exists, unused, unexpired  → mark used
           upsert user                              → Set-Cookie: sess`}</Code>
        <List
          items={[
            "No password is ever sent or stored — the signature proves key possession.",
            "The nonce prevents replay; a second attempt returns 401 (verified by test).",
            "The signature is public information; it authenticates one message and nothing else.",
            "The session cookie is what persists; the wallet is not re-prompted every request.",
          ]}
        />
      </Card>

      <Card title="Authentication system 2 — the access gate" tag="not SIWE">
        <p>
          The sign-in card at the entrance is a <strong>separate, much weaker</strong> mechanism:
          SHA-256 of <code className="font-mono text-[11px]">&quot;user:password&quot;</code> compared
          against a constant in the bundle, plus a flag in <code className="font-mono text-[11px]">sessionStorage</code>.
        </p>
        <List
          items={[
            "It exists so the walkthrough opens on a door, not a dashboard.",
            "It is not access control: the bundle is public and sessionStorage is editable.",
            "It grants no API authority — the API's own session guard is separate and required.",
          ]}
        />
        <Callout tone="slate" title="Why keep it at all?">
          <p>
            Presentation. An entry screen makes the product feel finished; a dashboard with no door
            asks for credentials looks like a product. The honest framing is that the page says so,
            and the real authentication path — SIWE — is implemented and working underneath.
          </p>
        </Callout>
      </Card>

      <Card title="The session cookie" tag="HMAC, not encryption">
        <Code>{`payload = base64url({ addr, exp })     // 2 hours
cookie  = payload + "." + HMAC-SHA256(payload, SESSION_SECRET)

on each request:
  recompute HMAC → timingSafeEqual(…) → parse payload → check exp`}</Code>
        <p>
          HMAC proves the payload was issued by the server; it does not hide it. Anyone can read the
          wallet address in the cookie — they just cannot alter it without the secret. The secret is
          32 random bytes in the server env file, never in the repository.
        </p>
      </Card>

      <Card title="What hashing does not do" tag="common misconceptions">
        <Table
          head={["Expectation", "Reality here"]}
          rows={[
            ["Hashing hides data", "It does not encrypt — the cookie payload is readable"],
            ["Hashes prove correctness", "A hash proves integrity of bytes, not truth of a claim"],
            ["Hashing makes it private", "Ethereum is a public ledger; amounts and addresses are visible"],
            ["A signature is a password", "It authenticates one message only, and is replayable without a nonce"],
          ]}
        />
      </Card>

      <Card title="Prove it" tag="commands">
        <Code>{`cast sig "fund(uint256)"
cast keccak "Funded(uint256)"
cast wallet address --private-key $BUYER_PRIVATE_KEY   # key → address
printf 'pattinson:bond' | shasum -a 256                # access gate digest`}</Code>
      </Card>
    </Page>
  );
}
