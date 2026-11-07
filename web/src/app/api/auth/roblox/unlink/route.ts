import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { unlinkRobloxAccount } from "@/lib/supabase";
import { appBaseUrl } from "@/lib/env";

function redirectWith(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard", request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // Exigir Origin en POST: mitiga CSRF cross-site.
  try {
    return new URL(origin).origin === new URL(appBaseUrl()).origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  // SameSite=Lax ya impide cookies en POST cross-site; Origin añade defensa en profundidad.
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  try {
    await unlinkRobloxAccount(session.id);
  } catch (error) {
    console.error("roblox_unlink_failed", error);
    return redirectWith(request, { roblox: "error", reason: "unlink_failed" });
  }
  return redirectWith(request, { roblox: "unlinked" });
}
