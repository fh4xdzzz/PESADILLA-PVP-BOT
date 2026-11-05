# PESADILLA PVP BOT v2 — Bot Oficial

Bot de Discord modular, TypeScript y de producción para la experiencia PvP de Roblox **PESADILLA PVP**. Controla la comunidad de Discord, administra sanciones reales en Roblox vía Open Cloud, gestiona estadísticas, tickets, sorteos y torneos.

## Arquitectura

- **Node.js 20+** + **TypeScript** + **Discord.js v14**
- **SQLite** (dev) / **PostgreSQL** (prod) vía **Prisma ORM**
- **Roblox Open Cloud** — API oficial para baneos, Data Stores y restricciones
- Slash commands, botones, modales, embeds
- Sistema de permisos jerárquico (OWNER > ADMIN > HEAD_MOD > MOD > SUPPORT_STAFF > EVENT_MANAGER)
- Auditoría completa de acciones (casos, bans, warns, configuración)
- Rate limiting para Roblox API (respetando límites oficiales: 2 updates/min por usuario)
- Idempotencia en baneos (idempotencyKey de Open Cloud)

## Estructura del proyecto

```
src/
  index.ts                 # entrypoint del bot
  deploy-commands.ts       # registro manual de comandos
  config.ts                # configuración validada con Zod
  logger.ts                # Pino logger estructurado
  db.ts                    # Prisma client
  core/
    permissions.ts         # jerarquía de staff y verificación de permisos
    audit.ts               # registro de auditoría en DB
    rateLimit.ts           # rate limiters (comandos, Roblox)
    embeds.ts              # plantillas de embeds con branding PESADILLA PVP
    errors.ts              # safeReply/safeError
  discord/
    client.ts              # cliente de Discord
    register.ts            # registro de slash commands
    customIds.ts           # IDs de botones/selects
  roblox/
    client.ts              # cliente HTTP para Open Cloud y APIs públicas
    users.ts               # username/UserId resolution, avatares
    restrictions.ts        # Ban API (UserRestriction, idempotencia)
    datastores.ts          # Data Stores y OrderedDataStores (stats, leaderboard)
    types.ts               # tipos TypeScript de las APIs
  commands/
    index.ts               # builders consolidados
    builders/
      moderation.ts        # /rban, /runban, /rbaninfo, /rwarn, /rkick, /rcase
      public.ts            # /stats, /top, /perfil, /vincular, /desvincular
      staff.ts             # /announce, /codes, /giveaway, /tournament, /ticket, /config
    handlers/
      moderation.ts        # handlers de moderación + confirmación de baneo
      public.ts            # handlers públicos
      staff.ts             # handlers staff/comunidad
    interactionHandler.ts # router de interacciones
  services/
    cases.ts               # CRUD de casos de moderación
    linking.ts             # vinculación Discord ↔ Roblox (códigos de 8 chars)
    pending.ts            # acciones pendientes de confirmación (en memoria)
    settings.ts           # configuración dinámica (canales, roles)
    engagement.ts         # sorteos, torneos
    tickets.ts             # sistema de tickets
  http/
    server.ts              # endpoint HTTP opcional para vinculación (Fastify)
prisma/
  schema.prisma           # esquema completo de DB
roblox-scripts/
  DataStoreStats.server.lua    # script de servidor para stats del juego
  LinkCodeValidator.server.lua # script para validar códigos de vinculación
```

## Instalación y configuración

### 1. Requisitos

- Node.js 20+ (LTS)
- npm o pnpm
- SQLite (dev) o PostgreSQL (prod)

### 2. Variables de entorno

Copia `.env.example` → `.env` y completa:

```bash
# === Discord ===
DISCORD_TOKEN=                      # token del bot de Discord
DISCORD_CLIENT_ID=                  # Application ID
SUPPORT_GUILD_ID=                  # ID del servidor de SOPORTE (comandos guild)
MAIN_GUILD_ID=                     # ID del servidor PRINCIPAL (opcional)
OWNER_IDS=                         # IDs separados por coma
ADMIN_IDS=
HEAD_MOD_IDS=
MOD_IDS=
SUPPORT_STAFF_IDS=
EVENT_MANAGER_IDS=

# === Roblox Open Cloud ===
ROBLOX_API_KEY=                    # API key con scopes universe.user-restriction:read/write
ROBLOX_UNIVERSE_ID=                # ID numérico de tu universe
ROBLOX_PLACE_ID=                   # ID del place (opcional, para restricciones a nivel de place)

# === Base de datos ===
DATABASE_URL="file:./pesadilla.db"  # SQLite en dev, PostgreSQL URL en prod

# === Bot ===
NODE_ENV=development
LOG_LEVEL=info
LINK_SECRET=                        # mínimo 16 caracteres (para vinculación segura)
```

### 3. Obtener IDs de Discord

- **Bot token & Client ID**: [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Token, OAuth2 → URL Generator
- **Server IDs**: en Discord, modo desarrollador activado → clic derecho en servidor → Copiar ID
- **User IDs**: modo desarrollador → clic derecho en usuario → Copiar ID

### 4. Configurar Roblox Open Cloud

1. Ve a [Creator Dashboard → Credentials](https://create.roblox.com/dashboard/credentials)
2. Crea una API key con los siguientes scopes:
   - `universe.user-restriction:read`
   - `universe.user-restriction:write`
   - `universe.datastore:read`
   - `universe.datastore:write`
3. Copia el API key → `ROBLOX_API_KEY`
4. Copia el **Universe ID** de tu experiencia → `ROBLOX_UNIVERSE_ID`

## Ejecución

### Desarrollo local

```bash
npm install
npm run db:generate
cp .env.example .env  # completa los valores
npm run dev          # tsx watch
```

### Registro de comandos

```bash
npm run deploy-commands
```

### Build para producción

```bash
npm run build
npm start          # ejecuta dist/index.js
```

### En SparkedHost (Apollo Panel)

1. **Git**: configura `GIT_ADDRESS = github.com/fh4xdzzz/PESADILLA-PVP-BOT`, `BRANCH = main`
2. **Startup**: archivo de inicio = `index.js` (el shim en la raíz importa `./dist/index.js` tras build)
3. **Variables**: agrega todas las variables de `.env` como variables de entorno del panel
4. **Install → Start**

> **Nota**: en SparkedHost usa Node.js, así que las dependencias se instalan automáticamente si hay `package.json`. El bot se compila con `tsc` antes de arrancar.

## Comandos del bot

### Moderación Roblox (requieren permiso de staff)

- `/rban <usuario> [duracion] <motivo> [evidencia] [nota_privada] [propagar_alts]` — banea un usuario de la experiencia. Requiere confirmación con botón.
- `/runban <usuario> <motivo>` — revoca un baneo. Requiere confirmación.
- `/rbaninfo <usuario>` — estado actual de restricción.
- `/rbanlist` — lista de baneos activos en Roblox.
- `/rbanhistory <usuario>` — historial de casos.
- `/rwarn <usuario> <motivo>` — registra advertencia.
- `/rwarnings [usuario]` — ver advertencias.
- `/rkick <usuario> <motivo>` — expulsa sesión (equivale a restricción breve de 5 min).
- `/rplayer <usuario>` — perfil del jugador (stats + restricción).
- `/rcase <id>` — ver un caso por número.

### Moderación Discord

- `/dban <usuario> <motivo> [dias]` — baneo de Discord.
- `/dunban <userid> [motivo]` — desbaneo.
- `/dwarn <usuario> <motivo>` — advertencia.
- `/dkick <usuario> <motivo>` — expulsión.
- `/dtimeout <usuario> <minutos> [motivo]` — timeout.

### Comandos públicos

- `/stats [usuario]` — estadísticas PvP (kills, deaths, K/D, wins).
- `/top` — top jugadores por kills.
- `/leaderboard [metric]` — leaderboard global (kills/wins/KD).
- `/rank [usuario]` — posición en ranking.
- `/perfil` — tu perfil vinculado.
- `/vincular` — genera código de 8 caracteres para vincular Discord ↔ Roblox.
- `/desvincular` — elimina vínculo.
- `/server` — estado del servidor/juego.

### Staff/comunidad

- `/announce <mensaje> [canal]` — publicar anuncio.
- `/game` — enlace oficial.
- `/status` — actualiza estado.
- `/update <titulo> <descripcion>` — novedades.
- `/sneakpeek <mensaje>` — adelantos.
- `/codes` — lista códigos activos.
- `/codecreate <codigo> [descripcion] [maxusos] [dias]` — crear código.
- `/codedelete <codigo>` — desactivar código.
- `/dailyshop <items>` — publicar tienda diaria.
- `/event create/list` — gestionar eventos.
- `/poll <pregunta> <opciones|>` — encuesta con botones.
- `/giveaway create/end/reroll` — sorteos.
- `/tournament create/register/list/result` — torneos.
- `/config set/list` — configurar canales/ajustes.
- `/ticket panel/close/claim` — panel y gestión de tickets.

## Sistema de baneo Roblox

### Flujo

1. `/rban @usuario 7d "Toxic behavior"` → bot resuelve username→UserId, muestra embed con avatar, duración, motivo.
2. Bot crea caso **PENDING** en DB y guarda acción en memoria (5 min TTL).
3. Bot muestra botones "🔨 Confirmar baneo" / "Cancelar".
4. Moderador presiona confirmar → bot aplica `PATCH /cloud/v2/universes/{universe}/user-restrictions/{userId}` con `gameJoinRestriction: {active, duration, displayReason, privateReason, excludeAltAccounts}`.
5. **Idempotencia**: el `caseId` pre-creado se usa como `idempotencyKey` del PATCH de Roblox → si el usuario presiona dos veces, Roblox rechaza el duplicado.
6. Caso se marca **ACTIVE**, se audita la acción, se publica embed en `registro-moderacion`.

### Rate limits respetados

- **UpdateUserRestriction**: máx 2 req/min por usuario dentro del universe (límite oficial de Roblox). El bot bloquea si se excede.
- **Global**: conservador 8 req/s por API key.

### Propagación a cuentas alternativas

- Solo permite `excludeAltAccounts: false` por defecto.
- `[ADMIN]` puede forzar `propagar_alts: true`.

### Permanentes

- Requerir permiso `PERMA_BAN_ROBLOX` (ADMIN/OWNER) para baneos sin duración.

## Vinculación Discord ↔ Roblox

1. Usuario usa `/vincular` → bot genera código de 8 chars (ej. `PVP-A1B2C3D4`), expira en 10 min.
2. Usuario entra a PESADILLA PVP en Roblox → ejecuta `/vincular PVP-A1B2C3D4` (o el script lo hace automáticamente).
3. Script del juego llama endpoint HTTP del bot (o usa MessageService) con código + Roblox userId.
4. Bot valida código → marca como usado → crea/actualiza `PlayerLink` en DB.
5. `/perfil` muestra datos combinados.

**Seguridad**: no se pide contraseña ni cookies de Roblox. Solo código de 8 chars generado por el bot.

## Data Stores y estadísticas

### Scripts en Roblox Studio

Copia los scripts de `roblox-scripts/` a tu experiencia:

- **DataStoreStats.server.lua**: registra kills, deaths, wins en DataStore + Open Cloud (si API key está configurada en ServerStorage).
- **LinkCodeValidator.server.lua**: valida códigos de vinculación vía HTTP (configura `LINK_ENDPOINT_URL`).

### Backend del bot

- `/stats` lee de Open Cloud DataStore `PVPStats_v1`.
- `/top` / `/leaderboard` lee de OrderedDataStore `PVPLeaderboard_v1` (scores ordenados).
- Si el juego aún no envía datos, el bot indica claramente "integración pendiente" — no inventa valores.

## Tickets

- `/ticket panel` publica panel con botón "Abrir ticket".
- Usuario selecciona categoría (reportar jugador, apelar baneo, técnico, etc.).
- Bot crea canal privado con permisos: usuario + staff roles.
- Staff puede reclamar, cerrar, reabrir tickets.
- Casos de apelación se vinculan a registros de baneo.

## Sorteos y torneos

- `/giveaway create <premio> <minutos> [ganadores]` — crea sorteo con botón de participación.
- `/tournament create <nombre> [maxjugadores]` — crea torneo en fase de registro.
- `/tournament register [ign]` — jugadores se apuntan (usa vínculo Discord→Roblox si está activo).
- `/tournament result <usuario> <colocacion>` — registra resultados.

## Despliegue 24/7 en SparkedHost

1. Compila localmente: `npm run build`
2. Asegúrate de que `index.js` (shim) esté en la raíz
3. Sube al repo: `git add . && git commit -m "build v2" && git push`
4. En Apollo Panel:
   - Git → configurar repo, rama `main`
   - Variables → copiar todas las del `.env`
   - Startup → archivo = `index.js`
   - Install → Start

## Checklist de pruebas

- [ ] Crear caso de ban con `/rban` y confirmar con botón
- [ ] Verificar que el baneo aparece en `registro-moderacion`
- [ ] `/rbaninfo` muestra la restricción activa
- [ ] `/runban` la revoca y la API responde
- [ ] `/rwarn` + `/rwarnings` registran advertencias
- [ ] `/stats` muestra datos reales (si el juego envía) o mensaje de "pendiente"
- [ ] `/vincular` genera código, script de Roblox lo valida, `/perfil` muestra vínculo
- [ ] `/ticket panel` abre canal privado, staff puede cerrarlo
- [ ] `/giveaway create` muestra botón, usuarios entran, `/giveaway end` elige ganadores
- [ ] `/tournament create` + `/tournament register` funciona
- [ ] `/config set channel.announcements <id>` + `/announce` publica en ese canal
- [ ] Rate limit de Roblox: intentar >2 bans/min en el mismo usuario → el bot bloquea con mensaje de error

## Límites y restricciones

- **Roblox Ban API**: 2 updates/min por usuario (global). El bot respeta esto con `robloxRestrictionLimiter`.
- **Idempotencia**: usa `idempotencyKey` del caso pendiente para evitar duplicados.
- **Jerarquía**: nadie puede moderar a alguien de su nivel o superior (verificado en backend).
- **Permanentes**: solo ADMIN/OWNER.
- **Propagación a alts**: solo ADMIN/OWNER.
- **Tokens/claves**: nunca en código. Usa `.env` y variables de entorno del panel.

## Solución de problemas

- **Comandos no aparecen**: si `SUPPORT_GUILD_ID` está vacío, se registran globalmente (tardan ~1h). Configúralo para registro instantáneo.
- **Roblox API 403**: revisa scopes de la API key (debe incluir `universe.user-restriction:write`).
- **Rate limit 429 de Roblox**: espera 1-2 min; el bot respeta límites pero si hay spam manual podría bloquearse.
- **Data Stores vacíos**: el juego debe ejecutar `DataStoreStats.server.lua` y tener estadísticas para guardar.

## Soporte

Cualquier bug o problema, revisa los logs del panel de SparkedHost (Console) y la tabla `AuditLog` en la DB para trazabilidad.
