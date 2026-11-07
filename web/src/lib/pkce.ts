import { createHash, randomBytes } from "crypto";

const VERIFIER_BYTES = 32; // 43 chars base64url — dentro del rango 43-128 de RFC 7636

export function generateCodeVerifier(): string {
  return randomBytes(VERIFIER_BYTES).toString("base64url");
}

export function codeChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function isValidVerifier(verifier: string): boolean {
  return typeof verifier === "string" && verifier.length >= 43 && verifier.length <= 128;
}
