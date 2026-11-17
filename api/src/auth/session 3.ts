import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.SESSION_SECRET ?? "";
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours inactivity limit

export interface SessionPayload {
  addr: string;
  exp: number;
}

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("base64url");
}

export function issueSession(address: string): string {
  const payload: SessionPayload = {
    addr: address.toLowerCase(),
    exp: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSession(token?: string): SessionPayload | null {
  if (!token || !SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const expected = sign(parts[0]);
  const got = Buffer.from(parts[1]);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as SessionPayload;
    if (typeof payload.addr !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "sess";
