import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { optionalEnv, requireEnv } from "./env";

export interface SessionUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  exp: number;
}

const COOKIE_NAME = "pesadilla_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  return requireEnv("SESSION_SECRET");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value: string): SessionUser | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
    if (typeof user.id !== "string" || typeof user.username !== "string") return null;
    if (typeof user.exp !== "number" || user.exp < Date.now()) return null;
    return user;
  } catch {
    return null;
  }
}

export function createSessionValue(user: Omit<SessionUser, "exp">): string {
  return encode({ ...user, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
}

export async function getSession(): Promise<SessionUser | null> {
  if (!optionalEnv("SESSION_SECRET")) return null;
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decode(raw);
}

export async function setSessionCookie(value: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function randomState(): string {
  return randomBytes(24).toString("base64url");
}
