import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { discordAvatarUrl } from "@/lib/discord";
import { isSupabaseConfigured } from "@/lib/env";
import { isRobloxConfigured } from "@/lib/roblox";
import { getRobloxLink, type RobloxLink } from "@/lib/supabase";
import UnlinkRobloxButton from "./UnlinkRobloxButton";

const ROBLOX_MESSAGES: Record<string, { text: string; tone: "ok" | "err" }> = {
  linked: { text: "Cuenta de Roblox vinculada correctamente.", tone: "ok" },
  unlinked: { text: "Cuenta de Roblox desvinculada.", tone: "ok" },
  denied: { text: "Roblox canceló la autorización. Puedes intentarlo de nuevo.", tone: "err" },
  already_linked: { text: "Esa cuenta de Roblox ya está vinculada a otro usuario de Discord.", tone: "err" },
  invalid_state: { text: "La sesión de vinculación expiró o no es válida. Inténtalo de nuevo.", tone: "err" },
  no_session: { text: "Tu sesión de Discord no está activa. Vuelve a iniciar sesión.", tone: "err" },
  not_configured: { text: "La vinculación con Roblox aún no está configurada en este despliegue.", tone: "err" },
  exchange_failed: { text: "No se pudo completar la vinculación con Roblox. Inténtalo de nuevo.", tone: "err" },
  unlink_failed: { text: "No se pudo desvincular la cuenta. Inténtalo de nuevo.", tone: "err" },
};

function RobloxSection({ link, linkError }: { link: RobloxLink | null; linkError: boolean }) {
  if (!isRobloxConfigured()) {
    return (
      <section className="mt-6 rounded-3xl border border-white/5 bg-panel/80 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Roblox</p>
        <p className="mt-2 text-sm text-zinc-400">
          La vinculación con Roblox estará disponible cuando se configuren las credenciales OAuth.
        </p>
      </section>
    );
  }

  if (linkError) {
    return (
      <section className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/5 p-6">
        <p className="text-sm text-red-300">
          No se pudo consultar el estado de tu vinculación de Roblox.
        </p>
      </section>
    );
  }

  if (!link || link.status !== "linked") {
    return (
      <section className="mt-6 rounded-3xl border border-void/25 bg-gradient-to-br from-void/10 to-transparent p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-void-soft">Roblox</p>
        <h2 className="mt-2 text-2xl font-bold">Vincula tu cuenta de Roblox</h2>
        <p className="mt-2 max-w-lg text-sm text-zinc-400">
          Conecta tu cuenta de forma segura con el inicio de sesión oficial de Roblox
          (OpenID Connect). Solo tú puedes autorizar la vinculación.
        </p>
        <a
          href="/api/auth/roblox"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00A2FF] to-[#6868FF] px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
        >
          CONNECT ROBLOX
        </a>
      </section>
    );
  }

  const profileUrl = `https://www.roblox.com/users/${link.roblox_user_id}/profile`;
  const linkedDate = link.linked_at
    ? new Date(link.linked_at).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <section className="mt-6 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          {link.roblox_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={link.roblox_avatar_url}
              alt={`Avatar de ${link.roblox_display_name ?? link.roblox_username}`}
              className="h-20 w-20 rounded-2xl bg-black/40 object-cover ring-2 ring-emerald-400/40"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00A2FF] to-[#6868FF] text-2xl font-black">
              {(link.roblox_display_name ?? link.roblox_username ?? "R").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {link.roblox_display_name ?? link.roblox_username}
              </h2>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-emerald-300">
                VERIFIED
              </span>
            </div>
            {link.roblox_username && (
              <p className="text-zinc-400">@{link.roblox_username}</p>
            )}
            <p className="mt-1 font-mono text-xs text-zinc-500">
              ID: {link.roblox_user_id}
            </p>
            {linkedDate && (
              <p className="mt-1 text-xs text-zinc-500">Vinculada el {linkedDate}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-sky-300 hover:underline"
          >
            Ver perfil de Roblox ↗
          </a>
          <UnlinkRobloxButton />
        </div>
      </div>
    </section>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/");

  const params = await searchParams;
  const noticeKey = typeof params.roblox === "string" ? params.roblox : null;
  const noticeReason = typeof params.reason === "string" ? params.reason : null;
  const errorNotice =
    noticeKey === "error" && noticeReason ? ROBLOX_MESSAGES[noticeReason] : undefined;
  const okNotice = noticeKey && noticeKey !== "error" ? ROBLOX_MESSAGES[noticeKey] : undefined;

  const avatar = discordAvatarUrl({
    id: session.id,
    username: session.username,
    global_name: session.globalName,
    avatar: session.avatar,
  });

  let link: RobloxLink | null = null;
  let linkError = false;
  try {
    link = await getRobloxLink(session.id);
  } catch {
    linkError = true;
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blood-soft">
            PESADILLA PVP
          </p>
          <h1 className="mt-1 text-3xl font-black">Dashboard</h1>
        </div>
        <a
          href="/api/auth/logout"
          className="rounded-xl border border-white/10 bg-panel px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-blood/50 hover:text-white"
        >
          Cerrar sesión
        </a>
      </header>

      {(okNotice || errorNotice) && (
        <div
          className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
            (okNotice?.tone ?? errorNotice?.tone) === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {okNotice?.text ?? errorNotice?.text}
        </div>
      )}

      <section className="mt-10 grid gap-6 sm:grid-cols-[auto_1fr]">
        <div className="flex items-start gap-5 rounded-3xl border border-white/5 bg-panel/80 p-6 backdrop-blur">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={`Avatar de ${session.globalName ?? session.username}`}
              className="h-20 w-20 rounded-2xl ring-2 ring-blood/40"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blood to-void text-2xl font-black">
              {(session.globalName ?? session.username).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xl font-bold">{session.globalName ?? session.username}</p>
            <p className="text-zinc-400">@{session.username}</p>
            <p className="mt-3 break-all font-mono text-xs text-zinc-500">
              ID: {session.id}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-panel/80 p-6 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <p className="font-semibold">Sesión activa</p>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Has iniciado sesión correctamente con Discord. Tu sesión está protegida con una
            cookie firmada HttpOnly.
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Base de datos:{" "}
            {isSupabaseConfigured() ? "Supabase conectada" : "Supabase pendiente de configurar"}
          </p>
        </div>
      </section>

      <RobloxSection link={link} linkError={linkError} />
    </main>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-white/5" />
          <div className="mt-10 h-40 animate-pulse rounded-3xl bg-white/5" />
        </main>
      }
    >
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}
