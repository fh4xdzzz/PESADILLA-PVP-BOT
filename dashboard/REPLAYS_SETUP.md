# PESADILLA PVP — Replays 3D de partidas

## Qué implementa esta primera versión

- Registro de posiciones X/Y/Z y orientación de cada jugador por parte del **servidor Roblox**, a 2 fotogramas/s.
- Los fotogramas se agrupan en fragmentos de 40 y se envían a Cloudflare D1 por HTTPS con el mismo secreto que ya se utiliza para los resultados.
- Historial paginado de partidas y perfil individual de jugador en el dashboard.
- Enlaces `▶ Replay 3D` para cada partida y visor privado con cámara rotatoria, zoom, reproducción, pausa, velocidad y línea de tiempo.
- Una partida sin datos grabados muestra **Replay no disponible**: el sistema no inventa grabaciones retroactivamente.

**Importante:** esto es una reconstrucción ligera de posiciones y direcciones, no un vídeo, no reproduce el mapa original ni movimientos de armas/disparos. Para recrear el mapa y acciones exactas habrá que implementar una segunda fase que guarde eventos, identidad de mapa y estados de armas.

## Instalación en Roblox Studio

1. En `ServerScriptService`, crea un **ModuleScript** llamado `PESADILLA_ReplayRecorder`.
2. Pega el contenido de `roblox-scripts/PESADILLA_ReplayRecorder.module.lua`.
3. Abre el controlador real de partidas, normalmente `PESADILLA_MatchService` o su equivalente. Necesitamos enganchar la grabación **en la misma ronda real** que reporta los resultados al dashboard.
4. Añade cerca de las dependencias del controlador:

```lua
local ReplayRecorder = require(game:GetService("ServerScriptService"):WaitForChild("PESADILLA_ReplayRecorder"))
```

5. En el momento en que empieza la partida, cuando ya existen el `matchId` utilizado para `PesadillaMatchReporter` y la lista de participantes reales:

```lua
ReplayRecorder.Start(matchId, participantes)
```

`participantes` debe ser un array de `Player`, UserIds numéricos o tablas `{userId=...}`; el controlador debe usar los participantes reales del enfrentamiento. **No generes un segundo ID ni otra ronda para los replays.**

6. Cuando **esa misma partida termina** (antes o después de llamar a `PesadillaMatchReporter.ReportMatch`, usando el mismo `matchId`):

```lua
ReplayRecorder.Finish(matchId)
```

Este segundo método programa el envío HTTPS por lotes sin frenar la pantalla de resultados. Evita detener inmediatamente el servidor al finalizar, pues la transferencia requiere que el proceso siga vivo. El grabador incluye reintentos, pero **no una cola persistente** si el servidor se cierra o agota sus intentos.

Si tu IA de Roblox Studio puede acceder a tus scripts, pídele:
> Integra `PESADILLA_ReplayRecorder` con `PESADILLA_MatchService` usando el mismo matchId que `PesadillaMatchReporter`. Llama Start al empezar cada combate con su lista de jugadores y Finish exactamente una vez al finalizar. No alteres las reglas, resultados, UI o DataStore. No grabes clientes, solo posiciones del servidor. Prueba una partida con dos jugadores y comprueba Output.

## Cloudflare

La API `POST /api/ingest/replay` utiliza `ROBLOX_INGEST_SECRET` y la binding `DB`; en Roblox sigue siendo `PVP_DASHBOARD_INGEST`. Deben coincidir **los valores**, nunca guardarlos en GitHub.

Las tablas `replay_meta` y `replay_chunks` se crean automáticamente en la primera llamada al módulo de replays. También están documentadas en `dashboard/schema.sql` para una instalación y migración explícitas.

**No hace falta añadir nuevas variables ni migrar manualmente si tu D1 permite las sentencias CREATE TABLE del Worker.**

En dashboard entra a **Partidas → Replay 3D** o **Jugadores → [Jugador] → Replay 3D**. Solo administradores que hayan iniciado sesión con Discord pueden verlos.

## Límites y costos

- 2 muestras por segundo.
- 15 minutos máximo por partida.
- 20 jugadores máximo por replay.
- Máximo 50 fragmentos por partida, 40 fotogramas por fragmento.
- Fotogramas/identificadores se almacenan en D1; a mayor número de partidas, mayor consumo de almacenamiento y escrituras.
- **El plan Cloudflare Free tiene 500 MB por base D1**, por lo que esta versión **no garantiza almacenamiento ilimitado de todas las partidas durante años**. Para retención extensa, pasar los paquetes a Cloudflare R2 con una política de conservación. Revisa uso de D1 y consultas; llegar a límites puede bloquear nuevos registros.

## Prueba de extremo a extremo

1. Verifica que el nuevo despliegue de Cloudflare esté **Ready**.
2. Instala el ModuleScript y conecta las llamadas Start / Finish desde tu MatchService.
3. Publica la experiencia e inicia una partida nueva con dos jugadores.
4. Abre Output del **servidor** y comprueba `[PESADILLA Replay] Grabando partida` y `[PESADILLA Replay] Replay guardado`.
5. Entra a `/partidas` con tu Discord autorizado; abre la nueva partida y pulsa `Replay 3D`.
6. Usa Play/Pausa, el selector de velocidad, arrastra el visor para rotar y usa la rueda para hacer zoom.
7. Si ves `Replay no disponible`, esa partida no tiene datos de grabación; si ves `Grabación parcial`, faltan fragmentos por sincronizar.

**Nota:** las partidas previas al primer despliegue no contienen fotogramas y no pueden reconstruirse.
