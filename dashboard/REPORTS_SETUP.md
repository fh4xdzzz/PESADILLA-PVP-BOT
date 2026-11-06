# Reportes PESADILLA PVP — instalación y pruebas

Esta integración usa la **misma base Cloudflare D1** y el secreto existente de Roblox; no reemplaza el bot de Discord ni el sistema de partidas.

## 1. API Cloudflare

La rama agrega estos endpoints:

- `POST /api/ingest/report`: recibe un reporte autenticado por `Authorization: Bearer <ROBLOX_INGEST_SECRET>` (únicamente desde el script del servidor Roblox).
- `GET /reportes`: lista y filtra denuncias, solo administradores Discord.
- `GET /reportes/:id`: muestra el caso, descripción filtrada e historial de acciones.
- `POST /reportes/:id/actualizar`: cambia el estado y guarda una nota interna en `audit_logs`. Requiere sesión administrador, **Origin** correcto y token **CSRF**.

El reporte puede pasar de `open` a `in_review`, `resolved` o `dismissed`. Esto **no banea** al jugador: el proceso disciplinario debe ser independiente.

No es necesaria ninguna migración SQL nueva porque se reutilizan las tablas `reports` y `audit_logs` que ya se crearon en D1 con `dashboard/schema.sql`.

## 2. Roblox Studio

En **ServerScriptService**, crea un **Script** llamado `PESADILLA_ReportServer` y copia:

`roblox-scripts/PESADILLA_ReportServer.server.lua`

En **StarterPlayer → StarterPlayerScripts**, crea un **LocalScript** llamado `PESADILLA_ReportClient` y copia:

`roblox-scripts/PESADILLA_ReportClient.client.lua`

Ambos scripts funcionan como un sistema separado del controlador PvP. El script del servidor crea el RemoteEvent `ReplicatedStorage.PESADILLA_ReportPlayer` automáticamente.

Comprueba:
- Que **Allow HTTP Requests** esté activado.
- Que `PVP_DASHBOARD_INGEST` esté configurado en Roblox Creator Hub Secret Store para el dominio `pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev`.
- Para pruebas en Studio, que exista el **Local Secret** con el mismo nombre y valor.
- Que `ROBLOX_INGEST_SECRET` esté definido en **Cloudflare Production** y coincida con el valor de Roblox.
- Que el Worker tenga el binding `DB` hacia tu D1.

**Nunca coloques secretos en LocalScripts, ReplicatedStorage o GitHub.** El cliente no transmite claves ni dice quién es el denunciante; ese ID lo decide `OnServerEvent` de Roblox.

## 3. Probar

1. Confirma que Cloudflare publicó el nuevo commit.
2. Abre el juego con **dos cuentas/jugadores**.
3. Pulsa **REPORTAR**, elige un jugador distinto a tu cuenta y una categoría, escribe al menos 5 caracteres y envía.
4. Comprueba que aparezca la confirmación del servidor.
5. Inicia sesión con Discord en el Dashboard → **Reportes**.
6. Entra al reporte, marca **En revisión**, añade una nota interna y guarda.
7. Comprueba que el historial de auditoría muestre el administrador y su acción.
8. Repite envíos para verificar la protección: máximo **3 reportes por denunciante en 10 minutos**; además, un intervalo de 60 segundos por jugador y servidor.

En caso de error, consulta **Output → Server** en Roblox: el script informa el código HTTP sin imprimir claves ni contenido privado.

## Seguridad, límites y trabajos posteriores

- Solo se aceptan reportes de jugadores **presentes en el mismo servidor** en el momento de reportar.
- Categorías permitidas: `cheating`, `exploiting`, `harassment`, `griefing`, `other`.
- Las descripciones se filtran en el servidor con Roblox `TextService` y solo se muestran a administradores. El reporte falla si Roblox no puede filtrarlo.
- La API verifica secreto, categorías, IDs, tamaño y duplicados. Los reintentos con el mismo `reportId` son idempotentes.
- Los valores se escapan al generar HTML, y la edición desde el dashboard verifica permisos, origen, CSRF y deja auditoría.
- **No se admiten todavía cargas de capturas o vídeos**: el backend no recibe archivos del cliente. El campo `evidence_url` legado es de solo lectura.
- Los límites de D1 y Cloudflare Free se aplican; para gran escala conviene implementar cuotas más estrictas y alertas.
- En un entorno de alta concurrencia, conviene reforzar la limitación distribuida con un contador transaccional dedicado.
- No hay baneos automáticos; las denuncias requieren revisión humana.
