import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { decodeSigned } from "@/lib/signed";
import { exchangeRobloxCode, fetchRobloxUserInfo, isRobloxConfigured } from "@/lib/roblox";
import { linkRobloxAccount } from "@/lib/supabase";
import { isValidVerifier } from "@/lib/pkce";
import type { RobloxOAuthState } from "../route";

const STATE_COOKIE = "roblox_oauth";

function redirectWith(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard", request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  // Usuario canceló la autorización en Roblox.
  if (url.searchParams.has("error")) {
    const response = redirectWith(request, { roblox: "error", reason: "denied" });
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const rawState = request.cookies.get(STATE_COOKIE)?.value;

  const session = await getSession();
  if (!session) {
    return redirectWith(request, { roblox: "error", reason: "no_session" });
  }
  if (!isRobloxConfigured()) {
    return redirectWith(request, { roblox: "error", reason: "not_configured" });
  }
  if (!code || !stateParam || !rawState) {
    return redirectWith(request, { roblox: "error", reason: "invalid_state" });
  }

  const state = decodeSigned<RobloxOAuthState>(rawState);
  if (
    !state ||
    state.exp < Date.now() ||
    state.state !== stateParam ||
    state.discordId !== session.id ||
    !isValidVerifier(state.verifier)
  ) {
    const response = redirectWith(request, { roblox: "error", reason: "invalid_state" });
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  try {
    const tokens = await exchangeRobloxCode(code, state.verifier);
    void tokens; // No persistimos tokens: solo necesitamos la identidad verificada.
    const userInfo = await fetchRobloxUserInfo(tokens.access_token);
    await linkRobloxAccount(session.id, userInfo);

    const response = redirectWith(request, { roblox: "linked" });
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("roblox_oauth_callback_failed", error);
    const message = error instanceof Error ? error.message : "";
    const reason = message.includes("roblox_already_linked")
      ? "already_linked"
      : message.includes("unknown_discord_user")
        ? "no_session"
        : "exchange_failed";
    const response = redirectWith(request, { roblox: "error", reason });
    response.cookies.delete(STATE_COOKIE);
    return response;
  }
}
