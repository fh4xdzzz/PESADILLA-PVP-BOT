# Conectar partidas reales de Roblox con PESADILLA PVP

## 1. Seguridad: configurar la clave de ingestión

Genera una cadena aleatoria de al menos 32 caracteres **en tu propio equipo**. Usa el mismo valor en los dos lugares siguientes, pero **nunca lo envíes por chat ni lo subas a GitHub**:

1. **Cloudflare Worker** `pesadilla-pvp-dashboard` → Settings → Variables and Secrets → Add secret: `ROBLOX_INGEST_SECRET`.
2. **Roblox Creator Hub** → tu experiencia → Secrets / Secret Store → crea `PVP_DASHBOARD_INGEST` con el **mismo valor**. Para pruebas locales configura también un Local Secret en Studio, si tu cuenta y Studio lo permiten.

El secreto anterior `LINK_SECRET` **NO** sirve para este nuevo endpoint. Usar una clave independiente permite revocarla sin afectar el bot.

## 2. Preparar Roblox Studio

- Publica o abre la experiencia PESADILLA PVP.
- En File → Experience Settings → Security, activa **Allow HTTP Requests**.
- Crea un **ModuleScript** llamado `PesadillaMatchReporter` dentro de `ServerScriptService`.
- Copia el contenido de [PesadillaMatchReporter.module.lua](../roblox-scripts/PesadillaMatchReporter.module.lua).
- **No lo pongas en ReplicatedStorage ni en un LocalScript.** Solo el servidor debe consultar los secretos y emitir resultados de partidas.

## 3. Conectar al controlador real de rondas

La API recibe una partida **completada**, no el evento de unión de un jugador. Desde tu sistema existente de rondas del servidor:

```lua
local HttpService = game:GetService("HttpService")
local Reporter = require(game.ServerScriptService.PesadillaMatchReporter)

-- Cuando comienza una ronda:
local matchId = HttpService:GenerateGUID(false)
local startedAt = DateTime.now():ToIsoDate()

-- Cuando termina la misma ronda, recopila los resultados REALES del servidor.
-- Ejemplo de formato, NO publicar números inventados:
local participants = {
    -- { userId = player.UserId, username = player.Name, kills = ..., deaths = ..., wins = 1 or 0 },
}
-- Solo enviar si el controlador obtuvo participantes válidos:
if #participants > 0 then
    local ok = Reporter.ReportMatch(matchId, startedAt, participants)
    if not ok then warn("No se pudo enviar el resultado: considerar reintento con el MISMO matchId") end
end
```

**No crees una nueva ronda artificial:** hay que integrar esta llamada donde tu experiencia ya determina ganadores, kills, muertes y finalización. Si todavía no existe controlador de rondas, necesitamos crearlo acorde con el gameplay.

## 4. Validación y resultados

Endpoint (solo POST de servidor): `https://pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev/api/ingest/match`.

JSON esperado:
```json
{
  "matchId": "id-unico-de-esta-ronda",
  "serverJobId": "job-id-del-servidor",
  "startedAt": "2026-11-06T00:00:00Z",
  "endedAt": "2026-11-06T00:05:00Z",
  "players": [
    {"userId": 123456789, "username": "JugadorEjemplo", "kills": 3, "deaths": 1, "wins": 1}
  ]
}
```

Este JSON es **solo la estructura** para orientar la integración. No lo insertes como partida real. El endpoint verifica un secreto Bearer, exige datos válidos, y guarda en D1 con el mismo `matchId` para evitar contar duplicados. `GET /api/summary` y las secciones Jugadores y Partidas son privadas, requieren iniciar sesión con Discord.

Estados típicos del endpoint:
- `201` partida insertada
- `200` partida repetida (sin duplicar)
- `401` secreto ausente/incorrecto
- `503` secreto `ROBLOX_INGEST_SECRET` o D1 no configurados
- `400` datos incompletos/incorrectos
- `500` error al escribir D1

## Pendientes y precauciones

- No están habilitados baneos ni ajustes de Discord desde el dashboard.
- No se recopilan datos automáticamente hasta conectar la llamada al sistema real de rondas y probar.
- Revisa la seguridad del secreto de Roblox y limita quién puede editar scripts del servidor.
- Para producción con gran tráfico, agregar cola de reintentos, controles antiabuso, límites por servidor y pruebas de integración.
