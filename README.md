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
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (o `SUPABASE_SERVICE_ROLE_KEY`),
`SUPABASE_RPC_SECRET`, `ROBLOX_CLIENT_ID`, `ROBLOX_CLIENT_SECRET`.

## Base de datos

Las migraciones viven en `supabase/migrations/` y se aplican al proyecto
Supabase `fh4xdzzz's Project`. RLS está activado en todas las tablas públicas;
los RPCs exigen `SUPABASE_RPC_SECRET` (guardado en `private.server_secrets`,
esquema no expuesto por PostgREST).

## Estado actual (Fase 2)

- Landing con botón **LOGIN WITH DISCORD**.
- OAuth2 de Discord (`identify`), sesión firmada en cookie HttpOnly.
- Dashboard con perfil de Discord.
- Vinculación voluntaria de cuentas Roblox: OAuth2 Authorization Code + PKCE
  S256, scopes `openid profile`, `state` firmado ligado a la sesión Discord,
  identidad verificada vía `userinfo.sub`, reglas de unicidad en backend
  (1 Discord = 1 Roblox, 1 Roblox = 1 Discord), desvinculación POST protegida
  por Origin + SameSite.
- Sin moderación, tickets, anticheat ni administración todavía.
