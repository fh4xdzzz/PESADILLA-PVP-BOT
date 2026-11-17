# PESADILLA PVP BOT — ejecución en Sparked Host

Este directorio contiene un **bot Node.js nuevo e independiente**, preparado para
desplegarlo en Sparked Host. No sustituye automáticamente el proceso que ya está
ejecutándose allí. No lo despliegues simultáneamente con otro proceso que use el
mismo `DISCORD_BOT_TOKEN` para evitar duplicados y eventos inconsistentes.

## Requisitos

- Node.js **24.17 o superior** (verifícalo desde la consola de Sparked Host).
- Una aplicación/bot de Discord, agregada al servidor con los scopes
  `bot applications.commands`, y permisos para ver, enviar, borrar mensajes y crear canales.
- En Discord Developer Portal -> Bot -> **Privileged Gateway Intents**:
  habilita **Server Members Intent** y **Message Content Intent**.
- El panel publicado en Vercel, conectado a la base de datos correcta y con
  las migraciones `0004` y `0005` aplicadas.

## Variables de entorno de Sparked Host

Añade los valores en el panel seguro de configuración, nunca en GitHub:

| Variable | Valor |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Token del **bot** desde Discord Developer Portal |
| `PANEL_BASE_URL` | Dominio HTTPS de tu panel Vercel, sin sufijos de ruta |
| `BOT_SYNC_TOKEN` | La **misma** clave aleatoria de 32+ caracteres que en Vercel (distinta del token Discord) |
| `SYNC_INTERVAL_MS` | Opcional; 30000 (30 segundos) |

**Nunca uses `SUPABASE_SERVICE_ROLE_KEY` en Sparked Host ni lo copies al bot.**

## Arranque

En la carpeta `bot/`:

```bash
npm install
npm start
```

El comando de arranque de Sparked Host puede ser `node src/index.js` si su
panel está configurado para utilizar la carpeta `bot/` como directorio principal.

## Funcionamiento

1. Al conectarse, registra `/ticket-panel` sin borrar otros comandos.
2. Descarga las preferencias de cada servidor del endpoint protegido de Vercel.
3. Revalida los cambios cada 30 s (se envía un ETag para respuestas 304).
4. Envía un heartbeat cada 60 s para mostrar «Conectado» en el panel.
5. Ejecuta únicamente los módulos que el administrador habilitó y que tengan
   canales/permisos válidos.

Los módulos se **desactivan por seguridad** si no llega ninguna actualización
exitosa durante más de cinco minutos. El bot continúa conectado, pero no aplica
moderación con una configuración obsoleta.

### Tickets

Configura en la web el ID del canal donde publicar el panel y, opcionalmente,
el ID del rol del personal de soporte. Activa Tickets y guarda. En Discord,
un administrador usa `/ticket-panel`. Los usuarios pulsan «Crear ticket»,
reciben un canal privado, y pueden cerrarlo con el botón.

**Cerrar un ticket elimina el canal y sus mensajes. No se crean transcripciones**
en esta versión.

### Moderación

El modo automático solo se activa si `autoModEnabled` está activado.
`antiSpamEnabled` elimina el sexto mensaje y sucesivos del mismo usuario
en una ventana de 6 segundos. `antiLinksEnabled` elimina enlaces comunes.
Se omiten miembros con permisos de moderación. El bot necesita
**Manage Messages** en el canal para borrar mensajes.

### Registros y bienvenidas

La bienvenida usa `{usuario}` y `{servidor}` en el mensaje.
Los registros incluyen entradas, salidas, mensajes borrados y acciones de moderación.

## Comprobaciones

```bash
npm test
npm run check
```

**Pendiente antes de producción:** probar el bot en un servidor de Discord de ensayo,
confirmar los permisos y validar que la API conecta con la **base del bot**.
