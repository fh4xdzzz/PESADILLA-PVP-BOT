# PESADILLA PVP BOT

Bot de Discord para administrar el servidor de **PESADILLA PVP** alojado en [SparkedHost](https://sparkedhost.com) (panel Apollo/Pterodactyl en `control.sparkedhost.us`), con integración opcional a **Roblox Open Cloud** (Data Stores).

## Comandos

| Comando | Descripción |
|---|---|
| `/power <start\|stop\|restart\|kill>` | Controla el estado del servidor |
| `/stats` | CPU, RAM, disco, red, uptime y estado |
| `/console send <comando>` | Envía un comando a la consola del servidor |
| `/console logs [líneas]` | Lee las últimas líneas de la consola |
| `/file read <ruta>` | Lee un archivo del servidor |
| `/file write <ruta> <contenido>` | Escribe/crea un archivo |
| `/file list [directorio]` | Lista archivos de un directorio |
| `/datastore get/set/list` | Data Stores de Roblox vía Open Cloud |

Todos los comandos requieren estar en `ADMIN_USER_IDS` del `.env`.

## Setup

### 1. Bot de Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. En **Bot** → **Reset Token** y copia el token → `DISCORD_TOKEN`.
3. Copia el **Application ID** → `DISCORD_CLIENT_ID`.
4. Invita el bot a tu servidor con este scope (reemplaza `CLIENT_ID`):

   ```
   https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands
   ```

5. Tu ID de usuario de Discord (clic derecho en tu perfil → Copiar ID, con modo desarrollador activado) va en `ADMIN_USER_IDS`.

### 2. SparkedHost (Apollo Panel)

1. Entra a [control.sparkedhost.us](https://control.sparkedhost.us) → **API Credentials** → crea una API key.
2. Copia la key → `SPARKEDHOST_API_KEY`.
3. El `SPARKEDHOST_SERVER_ID` es el UUID o identifier de tu servidor (aparece en la URL del panel, ej. `/server/<id>`).

### 3. Roblox Open Cloud (opcional, para `/datastore`)

1. En [create.roblox.com/dashboard/credentials](https://create.roblox.com/dashboard/credentials) crea una API key con scope de tu experience/universe.
2. `ROBLOX_API_KEY` = la key, `ROBLOX_UNIVERSE_ID` = el ID numérico de tu universo.

### 4. Ejecutar

```bash
npm install
cp .env.example .env   # completa los valores
npm start
```

Los slash commands se registran automáticamente al iniciar el bot. Si quieres forzarlo manualmente:

```bash
npm run deploy-commands
```

Si `DISCORD_GUILD_ID` está definido, los comandos aparecen al instante en ese servidor. Si no, se registran globalmente y pueden tardar hasta ~1 hora en estar disponibles.

## Estructura

```
src/
  index.js          # cliente de Discord + registro de comandos
  commands.js       # definiciones de slash commands
  handlers.js       # lógica de cada comando
  sparkedhost.js    # cliente de la API de Apollo Panel (power, resources, files, websocket)
  roblox.js         # cliente de Roblox Open Cloud (Data Stores)
  config.js         # lectura de .env
  deploy-commands.js# registro manual de comandos
```

## Notas

- La consola en vivo usa el websocket de Wings (`{"event":"auth"}` + `send command` / `send logs`).
- Los archivos `.rbxl`/`.rbxm` del place **no** se gestionan por esta API de archivos del servidor de juego — esto controla el servidor dedicado (si tu juego en SparkedHost es un servidor de Minecraft/Rust/etc.). Si tu "servidor" es la experiencia de Roblox en sí, avísame y ajustamos la integración.
