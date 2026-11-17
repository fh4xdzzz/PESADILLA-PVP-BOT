import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { isAuthorizedBot } from "@/lib/bot-auth";
import { getAdminSupabase } from "@/lib/supabase";
import { DEFAULT_GUILD_SETTINGS, validateGuildSettings } from "@/lib/guild-settings";

type Context = { params: Promise<{ guildId: string }> };
const noStore = { "Cache-Control": "private, no-store", Vary: "Authorization" };

/** Bot-only read endpoint. User session cookies cannot authenticate here. */
export async function GET(request: NextRequest, context: Context) {
  if (!isAuthorizedBot(request)) return NextResponse.json(
    { error: "Unauthorized" }, { status: 401, headers: noStore },
  );
  const { guildId } = await context.params;
  if (!/^\d{15,22}$/.test(guildId)) return NextResponse.json(
    { error: "Invalid guild ID" }, { status: 400, headers: noStore },
  );
  const db = getAdminSupabase();
  if (!db) return NextResponse.json(
    { error: "Database not configured" }, { status: 503, headers: noStore },
  );
  const { data, error } = await db.from("guild_configs")
    .select("settings,updated_at").eq("guild_id", guildId).maybeSingle();
  if (error) {
    console.error("bot_settings_read_failed", error.code);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503, headers: noStore });
  }
  const settings = validateGuildSettings({
    ...DEFAULT_GUILD_SETTINGS, ...(data?.settings ?? {}),
  }) ?? DEFAULT_GUILD_SETTINGS;
  const updatedAt = data?.updated_at ?? null;
  const etag = '"' + createHash("sha256").update(
    guildId + ":" + (updatedAt ?? "default") + ":" + JSON.stringify(settings),
  ).digest("hex") + '"';
  const headers = { ...noStore, ETag: etag };
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }
  return NextResponse.json({ guildId, settings, updatedAt }, { headers });
}
