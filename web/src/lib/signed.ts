import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { optionalEnv, requireEnv } from "./env";

function secret(): string {
  return requireEnv("SESSION_SECRET");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSigned<T>(data: T): string {
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSigned<T>(value: string): T | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function isSessionSecretConfigured(): boolean {
  return Boolean(optionalEnv("SESSION_SECRET"));
}
