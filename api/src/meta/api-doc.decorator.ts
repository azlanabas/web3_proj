import { SetMetadata } from "@nestjs/common";

export const API_DOC_KEY = "web3proj:apidoc";

export interface ApiDocMeta {
  auth: "public" | "session" | "buyer" | "seller" | "arbiter" | "owner";
  purpose: string;
}

/** Attaches human documentation to a route. The route list itself is reflected, not listed. */
export const ApiDoc = (auth: ApiDocMeta["auth"], purpose: string) =>
  SetMetadata(API_DOC_KEY, { auth, purpose } satisfies ApiDocMeta);
