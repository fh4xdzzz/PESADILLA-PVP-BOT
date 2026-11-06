import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { discordAvatarUrl } from "@/lib/discord";
import { isSupabaseConfigured } from "@/lib/env";

async function Dashboard() {
  const session = await getCurrentUser();
  if (!session) redirect("/");

  const avatar = discordAvatarUrl({
    id: session.id,
    username: session.username,
    global_name: session.globalName,
    avatar: session.avatar,
  });

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
            Base de datos: {isSupabaseConfigured() ? "Supabase conectada" : "Supabase pendiente de configurar"}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-void/25 bg-gradient-to-br from-void/10 to-transparent p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-void-soft">
          Próximamente
        </p>
        <h2 className="mt-2 text-2xl font-bold">Vincular cuenta de Roblox</h2>
        <p className="mt-2 max-w-lg text-sm text-zinc-400">
          En una fase posterior podrás conectar tu cuenta de Roblox de forma segura para
          sincronizar tu progreso con el bot y el panel. Esta función estará disponible cuando
          el propietario la habilite.
        </p>
        <button
          disabled
          className="mt-5 cursor-not-allowed rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-500"
        >
          Vinculación Roblox — próximamente
        </button>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-white/5" />
          <div className="mt-10 h-40 animate-pulse rounded-3xl bg-white/5" />
        </main>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
