# PESADILLA PVP BOT

Bot de Discord + panel web para la comunidad PESADILLA PVP.

## Arquitectura

| Componente | Dónde vive | Rol |
|---|---|---|
| `web/` | Vercel | Next.js + TypeScript + Tailwind. Landing, login Discord OAuth2, dashboard. |
| `bot/` | Sparked Host | Bot de Discord (proceso permanente). Código por versionar en fase posterior. |
| `supabase/` | Supabase Cloud | PostgreSQL: identidades Discord y futura vinculación Roblox. |
| GitHub | — | Este repositorio. |

> El bot **nunca** se despliega en Vercel ni se migra fuera de Sparked Host sin
> autorización explícita del propietario.

## Estructura

```
web/                  Aplicación Next.js (Vercel)
bot/                  Reservado para el código del bot (Sparked Host)
supabase/migrations/  Migraciones SQL de la base de datos
legacy/cloudflare-worker/  Versión anterior basada en Cloudflare Workers/D1 (referencia, no activa)
```

## Desarrollo local

```bash
cd web
npm install
cp .env.example .env.local   # rellena los valores
npm run dev
```

Variables necesarias (ver `web/.env.example`): `NEXT_PUBLIC_APP_URL`,
`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Base de datos

Las migraciones viven en `supabase/migrations/` y se aplican al proyecto
Supabase `fh4xdzzz's Project`. RLS está activado: solo el backend con
service role accede a los datos.

## Estado actual (Fase 1)

- Landing con botón **LOGIN WITH DISCORD**.
- OAuth2 de Discord (`identify`), sesión firmada en cookie HttpOnly.
- Dashboard con perfil de Discord y apartado reservado para Roblox.
- Sin moderación, tickets, anticheat ni administración todavía.
