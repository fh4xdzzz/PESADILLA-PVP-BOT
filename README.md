# PESADILLA PVP BOT — Panel y bot con sincronización

**Estado:** implementación de código en la rama de propuesta
`feat/pesadilla-bot-panel-v2`. La versión `main` y el proceso actual de
Sparked Host no se modifican hasta la instalación y revisión manual.

## Arquitectura

| Parte | Servicio | Función |
| --- | --- | --- |
| `web/` | Vercel + Next.js | Portada, Discord OAuth, selección de servidores, permisos y formularios |
| `supabase/` | Supabase PostgreSQL | Identidad Discord, OAuth cifrado, ajustes por servidor, heartbeats |
| `bot/` | Sparked Host (Node.js) | Ejecuta las funciones de Discord y consulta los ajustes por HTTPS |
| `legacy/` | No activo | Referencia del sistema Cloudflare anterior |

**No se emplea la clave `SUPABASE_SERVICE_ROLE_KEY` ni los tokens OAuth de usuarios
en el bot**. En su lugar, Vercel expone endpoints de lectura y heartbeat protegidos
con un token de sincronización distinto del token de Discord. El bot puede leer la
configuración, pero no alterar ajustes de los administradores.

## Funciones de esta implementación

- Inicio de sesión con Discord, consentimiento `identify guilds`, sesión HttpOnly.
- Selector de servidores donde el usuario tiene `MANAGE_GUILD`, `ADMINISTRATOR` o es propietario.
- Preferencias por servidor: bienvenidas, antispam, bloqueo de enlaces, registros, tickets con canal y rol de staff.
- Bot funcional: bienvenidas, eliminación de mensajes de spam/enlaces (solo si se activan
  y tiene permisos), registro de eventos y slash command `/ticket-panel`.
- Tickets privados con botón de creación/cierre y acceso al usuario, bot y rol de staff configurado.
- Estado de conexión del bot en dashboard basado en heartbeat (caduca después de 3 minutos).
- Sondeo de ajustes cada 30 segundos. Si la conexión falla más de cinco minutos, los módulos
  se desactivan temporalmente por seguridad.
- Revisión de permisos de Discord **en el backend en cada lectura/escritura** de ajustes.
- Control de versiones/ETag HTTP para evitar descargas de ajustes sin cambios.

**Límites:** sin transcripciones de tickets, moderación avanzada, pagos o integración con
sistemas de Roblox. El idioma seleccionado se guarda; los mensajes de sistema del bot
están implementados inicialmente en español.

## Despliegue

1. Identifica el **proyecto Supabase exclusivo del bot**. No apliques migraciones en una
   base de otro producto. Ejecuta las migraciones de `supabase/migrations/` en orden, especialmente
   `0004_bot_dashboard.sql` y `0005_bot_sync.sql`.
2. En **Vercel** (Root Directory `web`) configura las variables
   `NEXT_PUBLIC_APP_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `SESSION_SECRET`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `BOT_SYNC_TOKEN`.
   No publiques los valores en GitHub. Ver `web/.env.example`.
3. En Discord Developer Portal confirma el **Redirect URI** correspondiente a tu dominio
   en `/api/auth/discord/callback` y habilita los privileged intents
   **Server Members Intent** y **Message Content Intent** de la aplicación del bot.
4. Instala/autoriza el bot con permisos sobre canales, mensajes e invitaciones
   de comandos, y en **Sparked Host** (proceso independiente del sitio web)
   ejecuta el contenido de `bot/` siguiendo `bot/README.md`.
5. Entra al dashboard, elige el servidor, guarda los ajustes y comprueba el indicador
   «Conectado». Usa `/ticket-panel` en Discord para publicar el botón de tickets.
6. Prueba en un servidor de ensayo antes de habilitar automoderación en comunidades reales.

## API

| Método | Ruta | Acceso | Comportamiento |
| --- | --- | --- | --- |
| GET | `/api/servers` | Cookie de usuario | Lista los servidores administrables |
| GET/PUT | `/api/servers/{guildId}/settings` | Cookie y permisos Discord | Lee/actualiza ajustes de ese servidor |
| GET | `/api/servers/{guildId}/status` | Cookie y permisos Discord | Estado reciente del bot |
| GET | `/api/bot/guilds/{guildId}/settings` | Bearer `BOT_SYNC_TOKEN` | Lee ajustes; ETag/304 |
| POST | `/api/bot/heartbeat` | Bearer `BOT_SYNC_TOKEN` | Actualiza presencia por servidor |

El token de bot es exclusivo para la API interna; no es el secreto de Discord y debe
tener al menos 32 caracteres aleatorios. **Nunca colocar claves de servidor en
variables `NEXT_PUBLIC_*` ni subir `.env` reales.**

## Validaciones

Las GitHub Actions `web-check.yml` y `bot-check.yml` ejecutan la compilación
de Next.js, verificaciones de sintaxis y pruebas del bot sin credenciales de producción.

La fusión con `main` y el despliegue a producción requieren revisar que
las pruebas funcionen y que las variables del entorno estén configuradas.
