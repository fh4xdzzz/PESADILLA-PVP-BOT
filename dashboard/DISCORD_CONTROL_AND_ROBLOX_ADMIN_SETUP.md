# PESADILLA PVP — Discord Control Center + Roblox ADMIN

## Qué cambió
La web (/) ahora sirve sólo para configurar Discord y solicitar BAN, UNBAN y KICK. Se retiraron las páginas web de replays, jugadores, reportes y partidas. Las APIs de Roblox y la base de datos de partidas se conservan para el panel del juego.

## Configuración obligatoria
Cloudflare Worker: agregar BOT_CONFIG_SYNC_SECRET como Secret largo aleatorio (32+ caracteres). DASHBOARD_OWNER_IDS es opcional: por defecto 796931424112476171.
En el hosting del bot: agregar DASHBOARD_BASE_URL=https://pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev y BOT_CONFIG_SYNC_SECRET idéntico al Worker, luego reiniciar.
Roblox sigue utilizando PVP_DASHBOARD_INGEST en ServerScriptService, que coincide con ROBLOX_INGEST_SECRET del Worker. No publicar claves en GitHub ni LocalScripts.

El bot sincroniza cada 60 segundos las opciones de Discord al Prisma BotSetting existente. Los canales y mensajes de bienvenida funcionan cuando los handlers los consultan. Los interruptores de tickets, eventos, automoderación, etc. son configuración sincronizada, NO implementan por sí mismos handlers que estén incompletos.

## Moderación Roblox: contrato para Devin
Todos los servidores publicados ejecutan un Script que consulta GET /api/ingest/moderation/poll?serverJobId=GAME_JOB_ID con Bearer PVP_DASHBOARD_INGEST cada 5-10 segundos.
Respuesta: {ok:true,commands:[{id:1,roblox_user_id:'123',action:'ban|unban|kick',reason:'motivo'}]}.
Para ban: Players:BanAsync({UserIds={tonumber(uid)},Duration=-1,DisplayReason='Incumplimiento de normas',PrivateReason=reason,ApplyToUniverse=true,ExcludeAltAccounts=true}), con pcall. Activar BanningEnabled en Players (Studio).
Para unban: Players:UnbanAsync({UserIds={tonumber(uid)},ApplyToUniverse=true}) con pcall. Unban sólo del mismo ámbito de la sanción inicial.
Para kick: buscar Players:GetPlayerByUserId(uid) en ese servidor y llamar player:Kick() sólo si está conectado. NO confirmar kick desde un servidor donde no está el objetivo: todos los servidores pueden recibirlo durante dos minutos.
Confirmar SÓLO tras ejecución: POST /api/ingest/moderation/ack (Bearer secreto, JSON {id:1,status:'applied|failed',serverJobId:game.JobId,message:'resultado'}). No afirmar éxito sólo porque se creó la solicitud.
Evitar repeticiones con IDs procesados localmente, nunca aceptar solicitudes directamente desde un RemoteEvent de cliente. No banear al owner (UserId 8223424925). La cola de ban/unban usa lease 30s y hasta 5 intentos; los kicks sin confirmar expiran en 2 minutos.

## APIs para que Devin complete el panel ADMIN dentro de Roblox
POST /api/ingest/live/heartbeat: body {serverJobId,placeId,matches:[{matchId,players:[{userId,username}]}]} cada ~12 segundos; lista vacía cuando no hay combates. Expira a los 45s.
GET /api/ingest/live/matches?q=usuario: sesiones PvP activas de cualquier servidor.
GET /api/ingest/live/target?matchId=...&userId=...: servidor público exacto del jugador.
GET /api/ingest/live/history?userId=...&page=1: historial de partidas finalizadas del jugador, de todos los servidores.
GET /api/ingest/admin/roles y POST /api/ingest/admin/role: gestión de roles existente.

Para observar combate real, verificar staff desde el servidor, luego usar TeleportOptions.ServerInstanceId y TeleportService:TeleportAsync desde Script para unirse al servidor público objetivo. Al llegar, activar cámara CameraSubject sobre el humanoid del jugador; el espectador no participa en matchmaking, daño, puntuación ni recompensas. Studio Play Solo no verifica TeleportService; probar en servidores publicados.

## Seguridad y límites
OAuth Discord y DASHBOARD_ADMIN_IDS obligatorios en la web; sólo owner modifica config, Origin+CSRF para POST, actor auditado, 5 órdenes de moderación/minuto, protección de owners y staff elevado.
BOT_CONFIG_SYNC_SECRET sólo para bot; ROBLOX_INGEST_SECRET sólo para Roblox. Los bans, unbans y kicks quedan pendientes hasta el ACK del juego.
El espectador en vivo sólo observa partidas todavía activas. Partidas terminadas: datos de historial, no reconstrucción visual exacta.

## Pruebas
Confirmar GitHub Actions y despliegue Cloudflare Ready, D1, sync bot, BAN/UNBAN/KICK en dos servidores, acceso de roles, cámara real, historial de otro servidor, caducidad y auditoría.