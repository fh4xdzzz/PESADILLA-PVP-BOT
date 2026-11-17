import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getManageableGuilds } from "@/lib/discord-authorization";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Inicia sesión con Discord." }, { status: 401 });
  try {
    const servers = await getManageableGuilds(session.id);
    return NextResponse.json({ servers }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const missingAuthorization = error instanceof Error && error.message === "discord_reauthorization_required";
    console.error("server_list_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({
      error: missingAuthorization
        ? "Debes iniciar sesión con Discord de nuevo para autorizar tus servidores."
        : "No se pueden cargar tus servidores. Comprueba la base de datos y vuelve a intentarlo.",
    }, { status: missingAuthorization ? 409 : 503 });
  }
}
