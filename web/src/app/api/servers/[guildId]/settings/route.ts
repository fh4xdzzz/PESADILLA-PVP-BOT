import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getManageableGuilds } from "@/lib/discord-authorization";
import { getAdminSupabase } from "@/lib/supabase";
import { DEFAULT_GUILD_SETTINGS, validateGuildSettings } from "@/lib/guild-settings";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ guildId: string }> };

async function authenticateGuild(context: Context) {
  const session = await getSession();
  if (!session) return { status: 401 as const, message: "Inicia sesión con Discord." };
  const { guildId } = await context.params;
  if (!/^[0-9]{15,22}$/.test(guildId)) return { status: 400 as const, message: "ID de servidor inválido." };
  const guilds = await getManageableGuilds(session.id);
  const guild = guilds.find((item) => item.id === guildId);
  if (!guild) return { status: 403 as const, message: "No tienes permiso para administrar ese servidor." };
  return { session, guild };
}

function handleFailure(error: unknown) {
  console.error("guild_settings_failed", error instanceof Error ? error.message : "unknown");
  return NextResponse.json({ error: "No se pudo acceder a la configuración. Comprueba el despliegue y vuelve a intentarlo." }, { status: 503 });
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const result = await authenticateGuild(context);
    if ("status" in result) return NextResponse.json({ error: result.message }, { status: result.status });
    const db = getAdminSupabase();
    if (!db) throw new Error("missing_service_role_key");
    const { data, error } = await db.from("guild_configs")
      .select("settings,updated_at").eq("guild_id", result.guild.id).maybeSingle();
    if (error) throw new Error("settings_read_failed:" + error.code);
    const settings = validateGuildSettings({ ...DEFAULT_GUILD_SETTINGS, ...(data?.settings ?? {}) }) ?? DEFAULT_GUILD_SETTINGS;
    return NextResponse.json({ settings, updatedAt: data?.updated_at ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleFailure(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  // A same-origin write, in addition to SameSite=Lax cookies and signed session verification.
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Solicitud de origen no permitido." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Se requiere application/json." }, { status: 415 });
  }
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const settings = validateGuildSettings(input);
  if (!settings) return NextResponse.json({ error: "Uno o más ajustes son inválidos." }, { status: 400 });
  try {
    const result = await authenticateGuild(context);
    if ("status" in result) return NextResponse.json({ error: result.message }, { status: result.status });
    const db = getAdminSupabase();
    if (!db) throw new Error("missing_service_role_key");
    const updatedAt = new Date().toISOString();
    const { error } = await db.from("guild_configs").upsert({
      guild_id: result.guild.id,
      guild_name: result.guild.name,
      settings,
      updated_by: result.session.id,
      updated_at: updatedAt,
    }, { onConflict: "guild_id" });
    if (error) throw new Error("settings_write_failed:" + error.code);
    return NextResponse.json({ ok: true, updatedAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleFailure(error); }
}
