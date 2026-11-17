import { SiweMessage } from "siwe";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const BASE = "http://127.0.0.1:8310/api";
const account = privateKeyToAccount(generatePrivateKey());

const nonceRes = await fetch(`${BASE}/auth/siwe/nonce`, { method: "POST" });
const { nonce } = await nonceRes.json();
console.log("1. nonce issued:", nonce.slice(0, 12) + "...");

const msg = new SiweMessage({
  domain: "localhost:8311",
  address: account.address,
  statement: "Sign in to web3_proj",
  uri: "http://localhost:8311",
  version: "1",
  chainId: 11155111,
  nonce,
});
const message = msg.prepareMessage();
const signature = await account.signMessage({ message });

const verifyRes = await fetch(`${BASE}/auth/siwe/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, signature }),
});
console.log("2. verify:", verifyRes.status, await verifyRes.text());
const cookie = verifyRes.headers.getSetCookie()[0]?.split(";")[0];
console.log("3. cookie set:", cookie ? "yes" : "no");

const me = await (await fetch(`${BASE}/auth/me`, { headers: { cookie } })).json();
console.log("4. me:", JSON.stringify(me));

const body = {
  title: "2019 Toyota Hilux",
  make: "Toyota",
  model: "Hilux",
  year: 2019,
  vin: "MROHR1234567890",
  mileage: 64000,
  priceUsdc: "18500.000000",
};
const created = await fetch(`${BASE}/listings`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify(body),
});
console.log("5. create listing:", created.status);

const list = await (await fetch(`${BASE}/listings`)).json();
console.log("6. public list total:", list.total, "first:", list.items?.[0]?.title);

const unauth = await fetch(`${BASE}/listings`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
console.log("7. unauthenticated create:", unauth.status, "(expect 401)");

const replay = await fetch(`${BASE}/auth/siwe/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, signature }),
});
console.log("8. nonce replay:", replay.status, "(expect 401)");

const bad = await fetch(`${BASE}/listings`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ ...body, priceUsdc: "12.1234567" }),
});
console.log("9. invalid price precision:", bad.status, "(expect 400)");
