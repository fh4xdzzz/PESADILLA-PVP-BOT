import { NextRequest, NextResponse } from "next/server";
import { discordAuthorizeUrl } from "@/lib/discord";
import { randomState } from "@/lib/session";
import { isDiscordConfigured } from "@/lib/env";


export async function GET(request: NextRequest) {
  void request.nextUrl;
  if (!isDiscordConfigured()) {
    return NextResponse.json({ error: "Discord OAuth is not configured" }, { status: 503 });
  }
  const state = randomState();
  const response = NextResponse.redirect(discordAuthorizeUrl(state));
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
