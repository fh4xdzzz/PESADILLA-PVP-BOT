import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isRobloxConfigured } from "@/lib/roblox";
import { generateCodeVerifier, codeChallengeS256, isValidVerifier } from "@/lib/pkce";
import { encodeSigned, randomToken } from "@/lib/signed";
import { robloxAuthorizeUrl } from "@/lib/roblox";

const STATE_COOKIE = "roblox_oauth";
const STATE_TTL_MS = 10 * 60 * 1000;

export interface RobloxOAuthState {
  state: string;
  verifier: string;
  discordId: string;
  exp: number;
}

export async function GET(request: NextRequest) {
  void request.nextUrl;
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/?roblox=error&reason=no_session", request.url));
  }
  if (!isRobloxConfigured()) {
    return NextResponse.redirect(new URL("/dashboard?roblox=error&reason=not_configured", request.url));
  }

  const verifier = generateCodeVerifier();
  if (!isValidVerifier(verifier)) {
    return NextResponse.redirect(new URL("/dashboard?roblox=error&reason=pkce_failed", request.url));
  }
  const state: RobloxOAuthState = {
    state: randomToken(24),
    verifier,
    discordId: session.id,
    exp: Date.now() + STATE_TTL_MS,
  };

  const response = NextResponse.redirect(
    robloxAuthorizeUrl({ state: state.state, codeChallenge: codeChallengeS256(verifier) })
  );
  response.cookies.set(STATE_COOKIE, encodeSigned(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
