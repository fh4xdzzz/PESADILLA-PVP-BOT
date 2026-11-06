# PESADILLA PVP — Anticheat global (Cloudflare D1)

## Archivos
- `anticheat.js`: ingesta y consulta global autenticadas para el servidor Roblox.
- `anticheat-ui.js`: sección `/anticheat` en el dashboard web con filtro por usuario y paginación.
- `admin-player.js`: perfil consolidado para el panel administrativo de Roblox.
- `worker.js`: rutas para módulos nuevos.
- `schema.sql`: tabla e índices D1, también autocreados en la primera petición.

## Autenticación
Todos los endpoints `/api/ingest/anticheat*` y `/api/ingest/admin/player` requieren el header `Authorization: Bearer <ROBLOX_INGEST_SECRET>`. **Solo ServerScriptService**, nunca un LocalScript ni el navegador, debe enviar este secreto. La página `/anticheat` se protege con la sesión Discord OAuth y `DASHBOARD_ADMIN_IDS` ya existentes.

## Ingesta
`POST /api/ingest/anticheat`

Ejemplo:
```json
{
  "serverJobId": "a-valid-server-job-id",
  "entries": [
    {"userId":"123456789","username":"Jugador","kind":"SPEED","reason":"Velocidad fuera del límite","detail":"velocidad=75","count":3},
    {"userId":"123456789","username":"Jugador","kind":"AUTO_BAN","reason":"8 strikes","detail":{"durationDays":7},"count":8}
  ]
}
```

- Body JSON, máximo 64 KiB; entre 1 y 50 detecciones por petición.
- `userId`: string numérico positivo, 1–20 dígitos; `username` 1–40 caracteres.
- `kind`: letras/números/guion/guion bajo, 1–32 caracteres.
- `reason`: 1–240 caracteres; `detail`: string hasta 1200 caracteres o un objeto JSON pequeño.
- `count` entero de 0 a 1 000 000, almacenado en columna `strikes`.
- Respuesta HTTP 201: `{ "ok": true, "inserted": 2 }`.
- La API registra la detección, no aplica un ban nuevo ni cambia las strikes en memoria.

## Consultas (todas con Bearer del servidor)
- `GET /api/ingest/anticheat?userId=123456789&page=1`: historial del jugador entre todos los servidores.
- `GET /api/ingest/anticheat/all?page=1`: últimas detecciones de toda la experiencia.
- Ambas devuelven `{ok:true,page,pageSize:50,hasMore,entries:[{id,serverJobId,userId,username,kind,reason,detail,strikes,count,createdAt}]}`.
- `GET /api/ingest/admin/player?userId=123456789`: `{ok,userId,username,staffRole,matches:{totals,recent},moderation:{recent,lastConfirmedBanAction,banStatusSource},anticheat:{totalDetections,maxRecordedStrikes,distinctServers,flagged,recent}}`.

**Importante:** el flag `flagged:true` significa que existen detecciones históricas; no demuestra trampas ni que la persona siga baneada. `lastConfirmedBanAction` solo representa la última operación confirmada *desde la cola del dashboard*, no el estado oficial de la restricción de Roblox. Los servidores pueden consultar este resumen para ver advertencias, pero no deben activar sanciones automáticas nuevas basándose únicamente en este flag.

## Dashboard web
`/anticheat` muestra feed, usuario, tipo, motivo, strikes, servidor y fecha con paginación, protegido por OAuth y autorización del Worker. Solo lee D1. El módulo escapa las cadenas antes de mostrarlas.

## Despliegue y pruebas
1. Fusionar el PR después de que pasen los tests de GitHub Actions.
2. Confirmar que Cloudflare despliegue el Worker y muestre `Ready`.
3. El script existente del anti-cheat en Roblox registra en memoria pero todavía tiene que **enviar** las entradas acumuladas en batches al POST. El código del Worker no puede sacar información que nunca llegue de Roblox.
4. Ejecutar una partida, provocar un evento controlado en servidor de prueba y consultar los endpoints con el secreto desde el servidor.
5. Abrir `/anticheat` con sesión Discord autorizada y comprobar que la detección aparece.
6. Confirmar que `/api/ingest/admin/player` incluye historial de diferentes servidores.

Los demás endpoints existentes de partidas, moderación, Discord, reportes, roles y replays no se modifican.