# PESADILLA PVP BOT — Web + panel v2

Proyecto oficial de **PESADILLA PVP BOT**. El rediseño del panel está en la rama
`feat/pesadilla-bot-panel-v2`. La versión principal (`main`) permanece
sin cambios hasta aprobar la nueva versión.

## Componentes

| Directorio | Descripción |
|---|---|
| `web/` | Next.js en Vercel: portada, OAuth Discord, listado de servidores y configuración |
| `supabase/` | PostgreSQL: perfiles Discord, credenciales OAuth cifradas y preferencias por servidor |
| `bot/` | Bot que seguirá ejecutándose en Sparked Host; aún no está conectado al panel |
| `legacy/` | Implementación anterior Cloudflare/D1, fuera de uso |

**Importante:** Esta primera versión guarda preferencias en Supabase.
No aplica todavía los cambios en Discord: falta implementar la lectura/sincronización
de ajustes desde el proceso real del bot en Sparked Host.

## Puesta en marcha

1. Copia `web/.env.example` a `web/.env.local`.
2. Configura `NEXT_PUBLIC_APP_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `SESSION_SECRET`, `SUPABASE_URL` y **`SUPABASE_SERVICE_ROLE_KEY`**.
3. Configura el redirect URI en Discord Developer Portal:
   `https://TU_DOMINIO/api/auth/discord/callback`.
4. Aplica todas las migraciones de `supabase/migrations/`, incluida
   `0004_bot_dashboard.sql`.
5. En `web/`: `npm ci && npm run dev`.

En producción, configura las variables **solo en Vercel**. No subas
archivos .env ni claves a GitHub. Las variables con prefijo `NEXT_PUBLIC_`
son públicas; las claves secretas nunca deben tener ese prefijo.

## Acceso y permisos

- El OAuth solicita los scopes `identify guilds` y verifica el valor `state`.
- El backend intercambia el código por un token, lee el perfil y almacena
  access/refresh tokens **cifrados con AES-256-GCM** en Supabase.
- La clave de cifrado se deriva con separación de propósito de `SESSION_SECRET`.
  Si se rota ese secreto, hay que volver a iniciar sesión para regenerar los tokens.
- El navegador recibe solo una **cookie HttpOnly firmada** con duración de 7 días.
- Para leer o guardar ajustes, la API comprueba los permisos actuales
  `MANAGE_GUILD`, `ADMINISTRATOR` o propiedad del servidor en Discord.
- El backend utiliza la clave service role **exclusivamente en código del servidor**.
  No se utiliza el token del bot en Vercel.

## API de configuración

| Método | Endpoint | Función |
|---|---|---|
| GET | `/api/servers` | Lista servidores administrables del usuario autenticado |
| GET | `/api/servers/{guildId}/settings` | Devuelve la configuración guardada |
| PUT | `/api/servers/{guildId}/settings` | Valida y guarda las preferencias |

`PUT` exige `Content-Type: application/json` y una petición del mismo origen.
La estructura aceptada se define en `web/src/lib/guild-settings.ts`.

## Próximo paso: integrar el bot de Sparked Host

El bot deberá obtener los ajustes por una vía autenticada y de mínimo privilegio
(por ejemplo, una API de lectura server-to-server con credenciales distintas de
la service role) y aplicar cada módulo con permisos de Discord adecuados.
**No** se ha migrado ni modificado el proceso real del bot.

El sistema aún no incluye pagos, tickets operativos, automoderación en Discord
ni un instalador OAuth del bot. Los interruptores preparan y guardan
preferencias, sin afirmar que esas acciones ya se estén ejecutando.
