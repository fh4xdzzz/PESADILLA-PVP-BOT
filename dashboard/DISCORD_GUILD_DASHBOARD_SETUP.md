# PESADILLA PVP — Dashboard profesional multi-comunidad

## Uso en la web

Entra a `/discord`. En la columna **Servidores conectados** aparece cada servidor que detecta el bot. Selecciona el servidor **Comunidad principal** o **Soporte** por su nombre. Toda la configuración queda guardada por servidor: canales, roles, módulos, bienvenida y tipo de comunidad. No necesitas introducir IDs a mano.

Las listas de canales y roles se obtienen automáticamente del bot (GET desde la caché de Discord.js). El usuario selecciona opciones visibles: `# anuncios`, `# reglas`, `# tickets`, Moderador, Soporte, etc. Nunca se debe aceptar en el backend un ID de canal o rol que no pertenezca a ese servidor.

Si tienes dos servidores y ninguno aparece como principal/soporte inicialmente, selecciona cada uno y elige **Tipo de servidor** → Comunidad principal o Servidor de soporte → Guardar.

## Qué debe estar conectado

El Worker y el hosting del bot deben compartir el secreto `BOT_CONFIG_SYNC_SECRET` (mínimo 32 caracteres). Hosting del bot: `DASHBOARD_BASE_URL=https://pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev`. El bot debe reiniciarse tras actualizar su código. **No necesitas añadir IDs de Discord a Cloudflare ni manualmente en la web.** El bot descubre las comunidades de las que es miembro.

Cada dos minutos y ante cambios de canales o roles, el bot publica su directorio en `POST /api/sync/discord/guilds`. El Worker guarda snapshots en la tabla D1 `discord_guild_directory` con validez visual de 5 minutos; si no hay conexión, la UI informa explícitamente que está esperando al bot. Las consultas de sincronización desde el bot están protegidas por el Bearer exclusivo `BOT_CONFIG_SYNC_SECRET`.

La configuración guardada utiliza claves `guild.<DISCORD_GUILD_ID>.<setting>`, de modo que Soporte no altera Comunidad. `GET /api/sync/discord` devuelve `settings` y `guildTypes`. El bot sincroniza el almacenamiento Prisma y usa el servidor principal seleccionado para mantener los ajustes heredados sin prefijo compatibles con comandos existentes.

El evento de bienvenida consulta `getSetting(key, member.guild.id)`, por lo que puede funcionar con mensajes distintos para cada servidor. Los handlers que necesiten acceder a canales de Soporte pueden llamar `getSetting(key, guildId)` o `postToChannel(client,key,payload,guildId)`.

**Limitación real:** los interruptores de funciones como tickets, encuestas, sorteos y automoderación guardan la configuración, pero no hacen funcionar handlers del bot que todavía estén incompletos. Deben programarse y probarse por separado. No mostrar funcionalidades como activas si faltan.

## Seguridad

- La web requiere autenticación OAuth con Discord y autorización previa.
- Sólo el OWNER del dashboard puede editar las comunidades; otros administradores ven el estado.
- Cada POST exige Origin coincidente y token CSRF firmado.
- Los canales y roles se validan contra el directorio que envió el bot: imposible insertar arbitrariamente un ID de otro servidor a través del formulario.
- El secreto del bot nunca se expone en HTML, navegador ni GitHub.
- Todas las modificaciones de configuración quedan auditadas en D1.

## Validación

1. Verificar despliegue `Ready` en Cloudflare.
2. Reiniciar el hosting del bot con `BOT_CONFIG_SYNC_SECRET` y `DASHBOARD_BASE_URL` configurados.
3. En `/discord`, comprobar que aparecen los dos servidores por nombre con canales y roles reales.
4. Seleccionar Comunidad principal, asignar anuncios y reglas, guardar.
5. Seleccionar Soporte y configurar tickets, guardar.
6. Volver a Comunidad y comprobar que sus canales siguen intactos.
7. Revisar logs del bot para confirmar sincronización; comprobar un mensaje de bienvenida por servidor sin mostrar secretos.