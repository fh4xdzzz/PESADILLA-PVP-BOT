# PESADILLA PVP — Replay System V2

## Qué se implementó

Visor **dentro de Roblox** con ViewportFrame, WorldModel, avatares Roblox, plantilla de mapa, controles de pausa/velocidad/cámara/zoom, datos desde Cloudflare y marcadores de combate sincronizados.

**Límite importante:** todavía no es una grabación visual exacta del cliente. Solo registra 2 muestras de posición por segundo; las animaciones originales, el HUD, las armas, los efectos gráficos y los mapas específicos todavía necesitan instrumentación e integración.

## Instalación con IA de Roblox Studio

1. Actualiza el ModuleScript existente ServerScriptService/PESADILLA_ReplayRecorder con el contenido de roblox-scripts/PESADILLA_ReplayRecorder.module.lua de GitHub. No dupliques módulos ni cambies las llamadas Start/Finish ya conectadas al MatchService.
2. Crea ServerScriptService/PESADILLA_ReplayAccess (Script) usando roblox-scripts/PESADILLA_ReplayAccess.server.lua.
3. **Edita ADMIN_USER_IDS con los IDs de Roblox reales de los administradores**. La tabla está vacía por seguridad: sin configurar no funcionará en servidores publicados. En Studio se permite acceso para pruebas.
4. Crea StarterPlayer/StarterPlayerScripts/PESADILLA_ReplayViewer (LocalScript) usando roblox-scripts/PESADILLA_ReplayViewer.client.lua.
5. En ReplicatedStorage crea una carpeta PESADILLA_ReplayMaps con un Model llamado Default que sea copia exacta de la plantilla del mapa PvP real. No muevas el mapa activo. No incluyas scripts de gameplay en el template.
6. Abre el visor presionando F8 y pega el matchId exacto del dashboard. La contraseña PVP_DASHBOARD_INGEST sigue en el servidor únicamente.

## Eventos desde scripts autoritativos

Invoca el método RecordEvent **solo desde scripts de servidor que validen las acciones**:

```lua
ReplayRecorder.RecordEvent(matchId, 'fire', shooterPlayer, nil, muzzlePosition, weaponId)
ReplayRecorder.RecordEvent(matchId, 'hit', shooterPlayer, victimPlayer, hitPosition, weaponId)
ReplayRecorder.RecordEvent(matchId, 'kill', killerPlayer, victimPlayer, victimPosition, weaponId)
ReplayRecorder.RecordEvent(matchId, 'equip', player, nil, nil, weaponId)
ReplayRecorder.RecordEvent(matchId, 'ability', player, nil, effectPosition, abilityId)
ReplayRecorder.RecordEvent(matchId, 'round', teamCaptain, nil, nil, 'StartRound')
```

Los eventos de jump, respawn y death ya se registran automáticamente en el módulo cuando se detectan desde los Humanoids.

**Importante:** la IA de Roblox debe inspeccionar los scripts reales de las armas, habilidades, MatchService y daño para encontrar los puntos válidos donde registrar cada evento. No inventes APIs ni utilices información de clientes sin validación. La UI muestra etiquetas sincronizadas, no recrea todavía el aspecto gráfico exacto de proyectiles ni el HUD.

## Seguridad

GET /api/ingest/replay/meta, /chunk y /events requieren la cabecera Authorization con el secreto existente. Solo el servidor Roblox llama esos endpoints. El RemoteFunction comprueba ADMIN_USER_IDS, valida matchId e index y aplica rate limit. Nunca guardes el secreto en GitHub ni un LocalScript.

## Próxima fase para fidelidad de cliente

Instrumentar armas, HUD y animaciones; almacenar el mapId real por partida; compresión y frecuencia de fotogramas significativamente superior; reproducir toda la experiencia en un Place de replays privado en vez de depender solamente de ViewportFrame, que tiene limitaciones de representación de efectos/iluminación. No puede prometerse fidelidad exacta sin capturar datos visuales específicos que solo existen en el cliente.

## Mensaje para Roblox Assistant

> Instala los archivos ReplayAccess.server.lua y ReplayViewer.client.lua desde mi repositorio GitHub y actualiza el grabador existente. Conserva exactamente las llamadas Start/Finish que ya tiene PESADILLA_MatchService. Configura los UserIds de administrador autorizados, crea la plantilla del mapa real en ReplicatedStorage/PESADILLA_ReplayMaps/Default y añade RecordEvent a los scripts auténticos de disparos, daños, eliminaciones, equipamiento, habilidades y rondas. Valida todos los eventos en el servidor. No cambies combate ni reportes. Realiza un playtest, revisa Output y dime qué elementos de fidelidad visual todavía faltan.