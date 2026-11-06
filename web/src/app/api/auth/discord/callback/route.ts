import { NextRequest, NextResponse } from "next/server";
import { exchangeDiscordCode, fetchDiscordUser } from "@/lib/discord";
import { createSessionValue } from "@/lib/session";
import { upsertDiscordUser } from "@/lib/supabase";


function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get("oauth_state")?.value;
  const iss = url.searchParams.get("iss");

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("Invalid OAuth state", 403);
  }
  if (iss && iss !== "https://discord.com") {
    return fail("Unexpected OAuth issuer", 403);
  }

  try {
    const accessToken = await exchangeDiscordCode(code);
    const discordUser = await fetchDiscordUser(accessToken);

    try {
      await upsertDiscordUser(discordUser);
    } catch {
      // Session still works if Supabase is unreachable; do not block login.
    }

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set("pesadilla_session", createSessionValue({
      id: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name,
      avatar: discordUser.avatar,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.delete("oauth_state");
    return response;
  } catch (error) {
    console.error("discord_oauth_callback_failed", error);
    return fail("Discord login failed", 502);
  }
}
