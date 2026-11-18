/**
 * Presentation-only access gate.
 *
 * The credential is stored as a SHA-256 digest, not plaintext, but this is still NOT
 * security: the bundle is public and sessionStorage is editable. It exists so the walkthrough
 * opens on a sign-in card, not to protect anything.
 */
const CREDENTIAL_SHA256 =
  "4a2ff5c1d93211730acb79fc5e8a88f777dd13f095ac65c0770e940d499cfe43";

const KEY = "w3_auth";
const TTL_MS = 12 * 60 * 60 * 1000;

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signIn(username: string, password: string): Promise<boolean> {
  const candidate = `${username.trim().toLowerCase()}:${password}`;
  const digest = await sha256Hex(candidate);
  if (digest !== CREDENTIAL_SHA256) return false;
  sessionStorage.setItem(KEY, JSON.stringify({ exp: Date.now() + TTL_MS }));
  return true;
}

export function isAuthenticated(): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { exp?: number };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function signOut(): void {
  sessionStorage.removeItem(KEY);
}
