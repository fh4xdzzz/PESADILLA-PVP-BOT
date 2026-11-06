# PESADILLA PVP — Proyecto nuevo, desde cero

> **Proyecto reiniciado desde cero.** El código actual contiene solamente el login con Discord, el dashboard personal y la consulta/vinculación de perfiles Roblox. No reutiliza la web anterior, su Worker, sus endpoints, su base de datos ni sus secretos. Las versiones antiguas solo permanecen en el historial de Git y en ramas anteriores, no en el árbol de archivos de `main`.

## Paso 1 — Base vacía + login Discord

La primera versión tiene únicamente una web de inicio, login oficial con Discord OAuth2 (`identify`), sesión firmada HttpOnly, mini dashboard personal, consulta de perfiles públicos de Roblox y la opción de conectar tu propia cuenta de Roblox por OAuth2. **No hay bot de Discord todavía, ni comandos ni administración de servidores.** Los agregaremos poco a poco.

La búsqueda de perfiles públicos no demuestra la propiedad de una cuenta. Para verificar que un usuario controla su Roblox, **cada usuario debe autorizar la vinculación**. No es posible conectar automáticamente la cuenta de todos los usuarios sin su consentimiento.

### 1. Crear aplicaciones (sin compartir secretos)

- Discord Developer Portal → Applications → crear la aplicación y copiar **Application ID** y **Client Secret** (OAuth2).
- Añadir en Discord → OAuth2 → Redirects: `https://TU-NUEVO-DOMINIO/auth/discord`.
- Si deseas la vinculación verificada, crear credenciales OAuth2 en Roblox Creator Dashboard y registrar el redirect `https://TU-NUEVO-DOMINIO/auth/roblox` con scopes `openid profile`.

### 2. Ejecutar el Worker localmente

```bash
npm install
cp .env.example .dev.vars
npm run dev
```

Editar `.dev.vars` con los valores reales. Para pruebas locales `APP_BASE_URL=http://localhost:8787` y registrar ese callback exacto en Discord si el proveedor lo admite. Para producción utiliza **HTTPS**.

### 3. Publicar la nueva web

```bash
npx wrangler login
npm run deploy
```

Utiliza este repositorio y rama en un Worker **nuevo**, no en el Worker anterior. En Cloudflare → Worker → Settings → Variables and Secrets, añade `APP_BASE_URL` (URL exacta, sin barra final), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` y `SESSION_SECRET` (32+ caracteres aleatorios). Los secretos nunca van al repositorio. Los redirect URIs deben coincidir exactamente con `APP_BASE_URL`.

### 4. Habilitar vinculación Roblox con una D1 nueva

```bash
npx wrangler d1 create pesadilla-pvp-users-nuevo
```

Copia el `database_id` que aparece y añade al archivo `wrangler.jsonc` la sección:

```json
"d1_databases": [{"binding":"DB","database_name":"pesadilla-pvp-users-nuevo","database_id":"ID_CREADO"}]
```

Después crea la tabla, configura `ROBLOX_OAUTH_CLIENT_ID` y `ROBLOX_OAUTH_CLIENT_SECRET` en los secretos del Worker y despliega de nuevo:

```bash
npx wrangler d1 execute pesadilla-pvp-users-nuevo --remote --file=schema.sql
npm run deploy
```

La búsqueda de perfiles públicos funciona sin D1. La vinculación verificada requiere OAuth2 + D1.

### 5. Pruebas

```bash
npm run check
npm test
```

## Rutas iniciales

- `/` — Página de entrada
- `/login/discord` y `/auth/discord` — OAuth de Discord
- `/dashboard` — Sesión privada, perfil y búsqueda pública Roblox
- `/login/roblox` y `/auth/roblox` — Vinculación verificada voluntaria
- `/logout` — Fin de sesión
- `/health` — Estado del nuevo servicio

## Después

Se añadirán las opciones del bot y del dashboard **solo cuando el propietario decida qué funciones quiere**. Esta primera fase no accede a los datos de la experiencia Roblox ni a servidores Discord por sí sola.
