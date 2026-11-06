# PESADILLA PVP — Dashboard gratuito (Cloudflare Workers + D1)

Panel web inicial en una rama separada. **No modifica ni reinicia** el bot que está en SparkedHost. Coste obligatorio de hosting: **US$0 si se mantiene dentro de los límites gratuitos de Cloudflare**. Los límites de uso pueden suspender temporalmente el acceso cuando se alcanzan.

## Estado actual

- Dashboard responsive, temas oscuros y navegación: Inicio, Jugadores, Partidas, Reportes, Baneos, Discord.
- Login real con Discord OAuth2 (`identify`) y lista autorizada por IDs de Discord.
- Sesión firmada HMAC con expiración de 8 horas, cookies HttpOnly/Secure/SameSite=Lax.
- API privada `/api/summary`, y endpoint público de comprobación `/health`.
- Base de datos D1 opcional: script SQL con tablas de jugadores, partidas, participantes, reportes, sanciones y auditorías.
- Sin datos inventados: muestra — sin base de datos y 0 cuando las tablas están creadas vacías.
- Acciones de modificación **deshabilitadas**, pendiente de controles de autorización, auditoría y API de Roblox/Discord.

## Publicar en Cloudflare Workers (Free)

1. Crear una cuenta gratuita de Cloudflare y un Worker.
2. Conectar este repositorio GitHub a Workers Builds, usando como directorio raíz `dashboard`, o desplegar localmente con CLI:
   ```bash
   cd dashboard
   npm install
   npx wrangler login
   npm run deploy
   ```
3. Copiar la URL `https://...workers.dev` del Worker y añadirla en las variables como `APP_BASE_URL` (sin barra final).
4. En Discord Developer Portal > OAuth2 > Redirects, registrar **exactamente** `https://TU_WORKER.workers.dev/auth/callback`.
5. En Cloudflare > Worker > Settings > Variables and Secrets, configurar:
   - `APP_BASE_URL`: origen HTTPS real del Worker.
   - `DISCORD_CLIENT_ID`: Application ID del bot existente.
   - `DISCORD_CLIENT_SECRET`: Client Secret del OAuth2 de la aplicación; mantener secreto.
   - `DASHBOARD_ADMIN_IDS`: IDs numéricos de Discord de administradores, separados por coma.
   - `SESSION_SECRET`: cadena aleatoria de mínimo 32 caracteres.
6. Volver a desplegar si es necesario, entrar por `/login`, y probar `/health`.

Para crear la base de datos gratuita D1:

```bash
cd dashboard
npx wrangler d1 create pesadilla-pvp-dashboard
```

Pegar el `database_id` devuelto en `wrangler.jsonc` y descomentar `d1_databases`. Después aplicar:

```bash
npx wrangler d1 execute pesadilla-pvp-dashboard --remote --file=./schema.sql
npm run deploy
```

**No compartas aquí claves, tokens ni secretos.** No mezcles la SQLite local del bot con D1. La futura sincronización requiere un protocolo para eventos fiables desde scripts de servidor Roblox, autorización individual para bans, límite de peticiones y registro de auditoría. El panel no controla actualmente Roblox ni modifica Discord; todavía hay que implementar esas funciones.

## Prueba rápida

```bash
cd dashboard
npm install
npm run check
```

En la fase siguiente se conectarán ingesta de reportes/partidas y operaciones verificadas de moderación. Se recomienda desplegar primero el login y revisar permisos antes de añadir cualquier endpoint de escritura.
