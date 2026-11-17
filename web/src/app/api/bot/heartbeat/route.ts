import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedBot } from "@/lib/bot-auth";
import { getAdminSupabase } from "@/lib/supabase";

const noStore = { "Cache-Control": "private, no-store" };

/** Authenticated bot heartbeat. Limited to status updates; no configuration writes. */
export async function POST(request: NextRequest) {
  if (!isAuthorizedBot(request)) return NextResponse.json(
    { error: "Unauthorized" }, { status: 401, headers: noStore },
  );
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json(
    { error: "JSON required" }, { status: 415, headers: noStore },
  );
  let payload: unknown;
  try { payload = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
  }
  if (!payload || typeof payload !== "object") return NextResponse.json(
    { error: "Invalid request" }, { status: 400, headers: noStore },
  );
  const input = payload as Record<string, unknown>;
  if (!Array.isArray(input.guildIds) || input.guildIds.length === 0 || input.guildIds.length > 100 ||
      !input.guildIds.every((id) => typeof id === "string" && /^\d{15,22}$/.test(id)) ||
      typeof input.botUserId !== "string" || !/^\d{15,22}$/.test(input.botUserId)) {
    return NextResponse.json({ error: "Invalid guild IDs" }, { status: 400, headers: noStore });
  }
  const db = getAdminSupabase();
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503, headers: noStore });
  const now = new Date().toISOString();
  const rows = [...new Set(input.guildIds as string[])].map((id) => ({
    guild_id: id, bot_user_id: input.botUserId, last_seen_at: now,
  }));
  const { error } = await db.from("guild_bot_status").upsert(rows, { onConflict: "guild_id" });
  if (error) {
    console.error("bot_heartbeat_failed", error.code);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503, headers: noStore });
  }
  return NextResponse.json({ ok: true, received: rows.length }, { headers: noStore });
}
