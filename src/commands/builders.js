const { SlashCommandBuilder } = require('discord.js');

const moderationBuilders = [
  new SlashCommandBuilder()
    .setName('rban')
    .setDescription('[STAFF] Banea un usuario de la experiencia Roblox')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId de Roblox').setRequired(true))
    .addStringOption((o) => o.setName('duracion').setDescription('Temporal: 30m, 12h, 7d, 2w — vacío = permanente').setRequired(false))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo público').setRequired(true))
    .addStringOption((o) => o.setName('evidencia').setDescription('Enlace/captura').setRequired(false))
    .addStringOption((o) => o.setName('nota_privada').setDescription('Nota privada').setRequired(false))
    .addBooleanOption((o) => o.setName('propagar_alts').setDescription('[ADMIN] Propagar a cuentas alternativas').setRequired(false)),

  new SlashCommandBuilder()
    .setName('runban')
    .setDescription('[STAFF] Revoca un baneo de Roblox')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rbaninfo')
    .setDescription('[STAFF] Estado actual de restricción')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rbanlist')
    .setDescription('[STAFF] Lista los baneos activos'),

  new SlashCommandBuilder()
    .setName('rbanhistory')
    .setDescription('[STAFF] Historial de casos')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rwarn')
    .setDescription('[STAFF] Registra advertencia')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rwarnings')
    .setDescription('Ver advertencias')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(false)),

  new SlashCommandBuilder()
    .setName('rkick')
    .setDescription('[STAFF] Expulsa sesión (kick)')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rplayer')
    .setDescription('[STAFF] Perfil de jugador')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rcase')
    .setDescription('[STAFF] Ver caso por número')
    .addIntegerOption((o) => o.setName('id').setDescription('Número de caso').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('dban')
    .setDescription('[STAFF] Banea miembro de Discord')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true))
    .addIntegerOption((o) => o.setName('dias').setDescription('Duración (vacío = permanente)').setRequired(false).setMinValue(1).setMaxValue(3650)),

  new SlashCommandBuilder()
    .setName('dunban')
    .setDescription('[STAFF] Desbanea usuario de Discord')
    .addStringOption((o) => o.setName('userid').setDescription('ID de Discord').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false)),

  new SlashCommandBuilder()
    .setName('dwarn')
    .setDescription('[STAFF] Advertencia de Discord')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dkick')
    .setDescription('[STAFF] Expulsa miembro de Discord')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dtimeout')
    .setDescription('[STAFF] Timeout de Discord')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addIntegerOption((o) => o.setName('minutos').setDescription('Duración (máx 40320)').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false)),
];

const publicBuilders = [
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Estadísticas PvP')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId (vacío = tu cuenta vinculada)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('top')
    .setDescription('Top jugadores por kills'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Leaderboard global')
    .addStringOption((o) => o.setName('metric').setDescription('Métrica').setRequired(false)
      .addChoices({ name: 'Kills', value: 'kills' }, { name: 'Wins', value: 'wins' }, { name: 'K/D Ratio', value: 'kd' })),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Tu posición en ranking')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(false)),

  new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Tu perfil'),

  new SlashCommandBuilder()
    .setName('vincular')
    .setDescription('Vincula tu Discord con Roblox'),

  new SlashCommandBuilder()
    .setName('desvincular')
    .setDescription('Elimina vínculo'),

  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Estado del servidor/juego'),
];

const staffBuilders = [
  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('[STAFF] Publicar anuncio')
    .addStringOption((o) => o.setName('mensaje').setDescription('Texto').setRequired(true))
    .addChannelOption((o) => o.setName('canal').setDescription('Canal destino').setRequired(false)),

  new SlashCommandBuilder()
    .setName('game')
    .setDescription('Enlace oficial'),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('[STAFF] Actualizar estado'),

  new SlashCommandBuilder()
    .setName('update')
    .setDescription('[STAFF] Publicar novedad')
    .addStringOption((o) => o.setName('titulo').setDescription('Título').setRequired(true))
    .addStringOption((o) => o.setName('descripcion').setDescription('Descripción').setRequired(true)),

  new SlashCommandBuilder()
    .setName('sneakpeek')
    .setDescription('[STAFF] Adelanto')
    .addStringOption((o) => o.setName('mensaje').setDescription('Texto').setRequired(true)),

  new SlashCommandBuilder()
    .setName('codes')
    .setDescription('Códigos activos'),

  new SlashCommandBuilder()
    .setName('codecreate')
    .setDescription('[STAFF] Crear código')
    .addStringOption((o) => o.setName('codigo').setDescription('Código').setRequired(true))
    .addStringOption((o) => o.setName('descripcion').setDescription('Descripción').setRequired(false))
    .addIntegerOption((o) => o.setName('maxusos').setDescription('Usos máximos').setRequired(false).setMinValue(1))
    .addIntegerOption((o) => o.setName('dias').setDescription('Días de validez').setRequired(false).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('codedelete')
    .setDescription('[STAFF] Desactivar código')
    .addStringOption((o) => o.setName('codigo').setDescription('Código').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dailyshop')
    .setDescription('[STAFF] Publicar tienda diaria')
    .addStringOption((o) => o.setName('items').setDescription('Items (uno por línea)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('event')
    .setDescription('[STAFF] Gestionar eventos')
    .addSubcommand((s) => s.setName('create').setDescription('Crear evento')
      .addStringOption((o) => o.setName('titulo').setDescription('Título').setRequired(true))
      .addStringOption((o) => o.setName('fecha').setDescription('Fecha/hora').setRequired(true))
      .addStringOption((o) => o.setName('descripcion').setDescription('Descripción').setRequired(false)))
    .addSubcommand((s) => s.setName('list').setDescription('Listar eventos')),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('[STAFF] Encuesta con botones')
    .addStringOption((o) => o.setName('pregunta').setDescription('Pregunta').setRequired(true))
    .addStringOption((o) => o.setName('opciones').setDescription('Opciones separadas por |').setRequired(true)),

  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('[STAFF] Sorteos')
    .addSubcommand((s) => s.setName('create').setDescription('Crear sorteo')
      .addStringOption((o) => o.setName('premio').setDescription('Premio').setRequired(true))
      .addIntegerOption((o) => o.setName('duracion_min').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(10080))
      .addIntegerOption((o) => o.setName('ganadores').setDescription('Ganadores').setRequired(false).setMinValue(1).setMaxValue(20))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(false)))
    .addSubcommand((s) => s.setName('end').setDescription('Finalizar sorteo')
      .addStringOption((o) => o.setName('id').setDescription('ID').setRequired(true)))
    .addSubcommand((s) => s.setName('reroll').setDescription('Re-sortear')
      .addStringOption((o) => o.setName('id').setDescription('ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('[STAFF] Torneos')
    .addSubcommand((s) => s.setName('create').setDescription('Crear torneo')
      .addStringOption((o) => o.setName('nombre').setDescription('Nombre').setRequired(true))
      .addIntegerOption((o) => o.setName('maxjugadores').setDescription('Máx jugadores').setRequired(false).setMinValue(2).setMaxValue(64)))
    .addSubcommand((s) => s.setName('register').setDescription('Apuntarse')
      .addStringOption((o) => o.setName('ign').setDescription('Tu IGN (opcional si estás vinculado)').setRequired(false)))
    .addSubcommand((s) => s.setName('list').setDescription('Ver torneo activo'))
    .addSubcommand((s) => s.setName('result').setDescription('[STAFF] Registrar resultado')
      .addUserOption((o) => o.setName('usuario').setDescription('Ganador').setRequired(true))
      .addIntegerOption((o) => o.setName('colocacion').setDescription('Posición').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('config')
    .setDescription('[ADMIN] Configurar canales/ajustes')
    .addSubcommand((s) => s.setName('set').setDescription('Guardar ajuste')
      .addStringOption((o) => o.setName('clave').setDescription('Clave').setRequired(true))
      .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('Listar ajustes')),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistema de tickets')
    .addSubcommand((s) => s.setName('panel').setDescription('[STAFF] Publicar panel')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(false)))
    .addSubcommand((s) => s.setName('close').setDescription('[STAFF] Cerrar ticket')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal del ticket').setRequired(true)))
    .addSubcommand((s) => s.setName('claim').setDescription('[STAFF] Reclamar ticket')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal del ticket').setRequired(true))),
];

module.exports = { moderationBuilders, publicBuilders, staffBuilders };
