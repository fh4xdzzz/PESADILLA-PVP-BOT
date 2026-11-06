# PESADILLA PVP — Dashboard (fase 1)

Dashboard web **separado** del bot de Discord en SparkedHost. **No modifica** los comandos existentes, la base de datos SQLite ni los archivos del bot.

## Ya incluido

- Servidor HTTP Node.js sin dependencias externas adicionales, compatible con Railway.
- Login mediante **Discord OAuth2**, con allowlist estricta por ID de administrador.
- Cookies de sesión HMAC firmadas, HttpOnly, SameSite=Lax y Secure cuando se usa HTTPS.
- Protección de rutas privadas; API de lectura con estados vacíos **explícitos** (no datos ficticios).
- Diseño responsive para Resumen, Partidas, Jugadores, Reportes, Baneos y Discord.
- Endpoint de salud `/health`.

**IMPORTANTE:** Esto es una base funcional, no un sistema ya conectado a Roblox ni a Discord para editar configuraciones. Los botones de escritura permanecen deshabilitados hasta implementar persistencia, autorización fina, protección CSRF y las integraciones oficiales. No hay datos de partidas/reportes todavía.

## Despliegue en Railway

1. Crea un proyecto en [Railway](https://railway.com/) y vincula este repositorio.
2. Crea un servicio desde la rama de la funcionalidad cuando esté revisada (o fusiona el PR).
3. Configura el **Root Directory** del servicio a `/dashboard`.
4. En el [Discord Developer Portal](https://discord.com/developers/applications), agrega en OAuth2 → Redirects `https://TU-DOMINIO.up.railway.app/auth/callback`.
5. Configura las variables del archivo `.env.example` en Railway (sin subir valores reales).
6. Genera un dominio público y establece `APP_BASE_URL` a ese mismo origen HTTPS exacto, sin barra final.
7. Despliega. Verifica `/health` y después el inicio de sesión.

La aplicación requiere `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET` (>=32 caracteres), `DASHBOARD_ADMIN_IDS` y `APP_BASE_URL` en HTTPS en producción. Si falta configuración se detiene de forma segura.

## Desarrollo local

```bash
cd dashboard
cp .env.example .env # Las variables deben exportarse al entorno del proceso
npm start
```

Para localhost: `APP_BASE_URL=http://localhost:3000` y registra `http://localhost:3000/auth/callback` en OAuth2. Node no carga automáticamente el archivo .env: exporta las variables con tu shell o usa el panel de Railway.

## Fase 2 (no incluida todavía)

- PostgreSQL con tablas `players`, `matches`, `match_participants`, `reports`, `sanctions` y `audit_logs`.
- Ingesta de eventos Roblox desde scripts de servidor (nunca LocalScripts), autenticada con credenciales del servidor y validación de payload.
- Operaciones de ban/unban vía Roblox Open Cloud **desde el backend**, con confirmaciones y auditoría.
- Configuración de Discord mediante el bot existente y permisos por servidor; el dashboard no almacena su token.
- Protección CSRF, rate limits persistentes y almacenamiento de sesiones escalable antes de habilitar acciones administrativas.

Para no perder datos, **no apuntar dos instancias distintas a un archivo SQLite local**. La transición a PostgreSQL requiere un plan de migración del bot actual.
