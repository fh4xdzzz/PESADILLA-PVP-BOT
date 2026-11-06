# PESADILLA PVP — Replay Theater: Dashboard ↔ Roblox

## Qué cambió

El enlace de una partida `/replays/:matchId` ya no abre el antiguo Canvas con muñecos. Abre una página para **solicitar que Roblox reproduzca la partida en Replay Theater**.

Endpoints:

- `POST /api/ingest/replay/request`: requiere sesión firmada de Discord administradora, `Origin` del dashboard y `Content-Type: application/json`; payload `{ "matchId": "..." }`. No acepta un Roblox UserId inventado por el navegador.
- `GET /api/ingest/replay/claim?userId=8223424925`: requiere `Authorization: Bearer <ROBLOX_INGEST_SECRET>`, el mismo secreto que utiliza el servidor Roblox mediante `HttpService:GetSecret('PVP_DASHBOARD_INGEST')`. Devuelve `{ "ok": true, "matchId": "..." }` una vez o `{ "ok": true }` cuando no hay solicitud.

Las solicitudes se guardan en la tabla D1 `replay_launch_requests`, caducan cinco minutos después y su reclamación es atómica/de un solo uso. Al solicitar una partida nueva, sustituye la anterior pendiente para ese administrador.

## CONFIGURACIÓN OBLIGATORIA EN CLOUDFLARE

En Cloudflare → Workers & Pages → pesadilla-pvp-dashboard → Settings → Variables and Secrets, añade una variable de texto:

**`REPLAY_ADMIN_BINDINGS`** con la sintaxis `DISCORD_USER_ID:ROBLOX_USER_ID`.

Para el dueño de PESADILLA PVP, su Roblox UserId confirmado es `8223424925`. Debes buscar el **Discord UserId** de la cuenta que entra al dashboard con OAuth. Ejemplo de formato (el Discord ID a continuación es deliberadamente ficticio):

```
REPLAY_ADMIN_BINDINGS=123456789012345678:8223424925
```

Para varios administradores: `DISCORD_ID_1:ROBLOX_ID_1,DISCORD_ID_2:ROBLOX_ID_2` con los IDs numéricos reales. Esta variable es distinta de `DASHBOARD_ADMIN_IDS` porque las cuentas de Discord y Roblox no comparten identificador. No confíes en el ID de Roblox que envíe el navegador.

**Sin configurar esta vinculación el botón permanecerá deshabilitado**, como medida de seguridad. No publiques el secreto `ROBLOX_INGEST_SECRET` ni su valor en GitHub.

La tabla D1 se crea automáticamente al usar la cola. El esquema también está documentado en `dashboard/schema.sql`.

## Comprobación del teatro instalado por Devin

1. Verifica que la implementación publicada de Devin haga polling al endpoint exacto `/api/ingest/replay/claim?userId=8223424925`, usando el mismo secreto solo desde un Script del servidor Roblox, nunca desde el cliente.
2. Debe comprobar la autorización de admin en el servidor antes de enviar `PESADILLA_ReplayLaunch` al cliente. Solo el usuario con ese UserId debe recibir ese evento.
3. Abre una partida con replay completamente guardado desde `/partidas` y pulsa `Abrir Replay Theater en Roblox`.
4. Entra en PESADILLA PVP publicado con tu cuenta autorizada, o si ya estás conectado espera el próximo polling. La solicitud desaparece al ser reclamada; no se puede reclamar dos veces.
5. Si el Theater no se abre, usa F7 y pega el matchId. Verifica Server Output y logs del Worker; observa errores como 401 (secreto no coincide), 403 (UserId no vinculado) o 409 al solicitar una partida aún incompleta.

**Nota:** este cambio no transforma las grabaciones anteriores en vídeo ni permite recrear la apariencia original si faltan datos de animaciones, armas, cámara y efectos. La fidelidad visual depende del sistema de Devin instalado en Roblox Studio.

## Seguridad

- Dashboard: usuario firmado por Discord y listado en `DASHBOARD_ADMIN_IDS`.
- Vinculación servidor: Discord → Roblox ID mediante `REPLAY_ADMIN_BINDINGS`.
- CSRF: verificación de Origin contra `APP_BASE_URL`.
- Roblox: Bearer del secreto existente + UserId permitido.
- Sólo se pueden solicitar partidas con `replay_meta.finished=1`.
- Las solicitudes tienen expiración y un único consumo atómico. No se revelan por el navegador las credenciales del Worker.