import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getManageableGuilds } from "@/lib/discord-authorization";
import { getAdminSupabase } from "@/lib/supabase";

type Context = { params: Promise<{ guildId: string }> };

/** Session + Discord permission check before showing bot status. */
export async function GET(_request: Request, context: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  const { guildId } = await context.params;
  if (!/^\d{15,22}$/.test(guildId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const guilds = await getManageableGuilds(session.id);
    if (!guilds.some((guild) => guild.id === guildId)) return NextResponse.json(
      { error: "No autorizado" }, { status: 403 },
    );
  } catch {
    return NextResponse.json({ error: "Discord no disponible" }, { status: 503 });
  }
  const db = getAdminSupabase();
  if (!db) return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  const { data, error } = await db.from("guild_bot_status")
    .select("last_seen_at").eq("guild_id", guildId).maybeSingle();
  if (error) return NextResponse.json({ error: "No se pudo leer el estado" }, { status: 503 });
  const lastSeen = data?.last_seen_at ?? null;
  const online = !!lastSeen && Date.now() - Date.parse(lastSeen) < 3 * 60_000;
  return NextResponse.json({ online, lastSeen }, { headers: { "Cache-Control": "no-store" } });
}
