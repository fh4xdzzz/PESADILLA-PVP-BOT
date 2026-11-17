import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

/** Read-only credentials for the Discord process. Never use the Discord bot token here. */
export function isAuthorizedBot(request: NextRequest): boolean {
  const expected = process.env.BOT_SYNC_TOKEN;
  const auth = request.headers.get("authorization");
  if (!expected || expected.length < 32 || !auth?.startsWith("Bearer ")) return false;
  const provided = auth.slice(7);
  if (provided.length < 32 || provided.length > 512) return false;
  // Fixed-length digests avoid leaking token lengths while comparing.
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
