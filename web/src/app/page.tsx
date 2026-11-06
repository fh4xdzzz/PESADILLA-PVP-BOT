import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDiscordConfigured } from "@/lib/env";

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

async function SessionGate() {
  const session = await getCurrentUser();
  if (session) redirect("/dashboard");
  const configured = isDiscordConfigured();

  return (
    <div className="animate-fade-up">
      {configured ? (
        <a
          href="/api/auth/discord"
          className="animate-pulse-glow inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#5865F2] to-[#4752c4] px-10 py-4 text-lg font-bold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <DiscordIcon />
          LOGIN WITH DISCORD
        </a>
      ) : (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-amber-200">
          El inicio de sesión con Discord aún no está configurado en este despliegue.
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl text-center">
        <div className="animate-fade-up">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-blood-soft">
            Zona de batalla
          </p>
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            PESADILLA
            <span className="bg-gradient-to-r from-blood via-rose-500 to-void bg-clip-text text-transparent">
              {" "}
              PVP
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-zinc-400">
            El panel oficial de la comunidad. Inicia sesión con Discord para entrar a tu dashboard.
          </p>
        </div>

        <div className="mt-12 min-h-16">
          <Suspense fallback={<div className="h-14 w-64 animate-pulse rounded-2xl bg-white/5 mx-auto" />}>
            <SessionGate />
          </Suspense>
        </div>

        <div
          className="animate-fade-up mt-16 grid grid-cols-1 gap-4 text-left sm:grid-cols-3"
          style={{ animationDelay: "0.3s" }}
        >
          {[
            ["01", "Entra con Discord", "Autenticación oficial y segura."],
            ["02", "Tu panel personal", "Perfil, sesión y ajustes de tu cuenta."],
            ["03", "Vincula Roblox", "Próximamente: conecta tu cuenta de Roblox."],
          ].map(([n, title, desc]) => (
            <div
              key={n}
              className="rounded-2xl border border-white/5 bg-panel/80 p-5 backdrop-blur"
            >
              <p className="font-mono text-xs text-blood-soft">{n}</p>
              <p className="mt-2 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
