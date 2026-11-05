import { SlashCommandBuilder } from 'discord.js';

export const staffBuilders: SlashCommandBuilder[] = [
  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('[STAFF] Publicar un anuncio')
    .addStringOption((o) => o.setName('mensaje').setDescription('Texto del anuncio').setRequired(true))
    .addChannelOption((o) => o.setName('canal').setDescription('Canal destino (default: announcements configurado)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('game')
    .setDescription('Muestra el enlace oficial de la experiencia'),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('[STAFF] Actualizar el estado de la experiencia/servidor'),

  new SlashCommandBuilder()
    .setName('update')
    .setDescription('[STAFF] Publicar una novedad/changelog')
    .addStringOption((o) => o.setName('titulo').setDescription('Título del update').setRequired(true))
    .addStringOption((o) => o.setName('descripcion').setDescription('Descripción').setRequired(true)),

  new SlashCommandBuilder()
    .setName('sneakpeek')
    .setDescription('[STAFF] Publicar un adelanto del staff')
    .addStringOption((o) => o.setName('mensaje').setDescription('Descripción del adelanto').setRequired(true)),

  new SlashCommandBuilder()
    .setName('codes')
    .setDescription('Lista los códigos de canje activos'),

  new SlashCommandBuilder()
    .setName('codecreate')
    .setDescription('[STAFF] Crear un código de canje')
    .addStringOption((o) => o.setName('codigo').setDescription('Código (ej. PVP2026)').setRequired(true))
    .addStringOption((o) => o.setName('descripcion').setDescription('Qué recompensa da').setRequired(false))
    .addIntegerOption((o) => o.setName('maxusos').setDescription('Usos máximos (vacío = ilimitado)').setRequired(false).setMinValue(1))
    .addIntegerOption((o) => o.setName('dias').setDescription('Días de validez (vacío = sin expiración)').setRequired(false).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('codedelete')
    .setDescription('[STAFF] Desactivar un código')
    .addStringOption((o) => o.setName('codigo').setDescription('Código a desactivar').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dailyshop')
    .setDescription('[STAFF] Publicar la tienda diaria')
    .addStringOption((o) => o.setName('items').setDescription('Items de la tienda (uno por línea)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('event')
    .setDescription('[STAFF] Gestionar eventos')
    .addSubcommand((s) => s.setName('create').setDescription('Crear un evento')
      .addStringOption((o) => o.setName('titulo').setDescription('Título').setRequired(true))
      .addStringOption((o) => o.setName('fecha').setDescription('Fecha/hora (ej. 2026-11-10 20:00 UTC)').setRequired(true))
      .addStringOption((o) => o.setName('descripcion').setDescription('Descripción').setRequired(false)))
    .addSubcommand((s) => s.setName('list').setDescription('Listar eventos próximos')),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('[STAFF] Crear una encuesta con botones')
    .addStringOption((o) => o.setName('pregunta').setDescription('Pregunta').setRequired(true))
    .addStringOption((o) => o.setName('opciones').setDescription('Opciones separadas por | (máx 5)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('[STAFF] Gestionar sorteos')
    .addSubcommand((s) => s.setName('create').setDescription('Crear un sorteo')
      .addStringOption((o) => o.setName('premio').setDescription('Premio').setRequired(true))
      .addIntegerOption((o) => o.setName('duracion_min').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(10080))
      .addIntegerOption((o) => o.setName('ganadores').setDescription('Número de ganadores').setRequired(false).setMinValue(1).setMaxValue(20))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal del sorteo (default: canal actual)').setRequired(false)))
    .addSubcommand((s) => s.setName('end').setDescription('Finalizar un sorteo por ID')
      .addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true)))
    .addSubcommand((s) => s.setName('reroll').setDescription('Re-sortear un sorteo finalizado')
      .addStringOption((o) => o.setName('id').setDescription('ID del sorteo').setRequired(true))),

  new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('[STAFF] Gestionar torneos')
    .addSubcommand((s) => s.setName('create').setDescription('Crear torneo')
      .addStringOption((o) => o.setName('nombre').setDescription('Nombre del torneo').setRequired(true))
      .addIntegerOption((o) => o.setName('maxjugadores').setDescription('Máx jugadores (vacío = 8)').setRequired(false).setMinValue(2).setMaxValue(64)))
    .addSubcommand((s) => s.setName('register').setDescription('Apuntarse al torneo')
      .addStringOption((o) => o.setName('ign').setDescription('Tu IGN de Roblox (opcional si estás vinculado)').setRequired(false)))
    .addSubcommand((s) => s.setName('list').setDescription('Ver torneo activo y participantes'))
    .addSubcommand((s) => s.setName('result').setDescription('[STAFF] Registrar resultado (colocación)')
      .addUserOption((o) => o.setName('usuario').setDescription('Ganador/participante').setRequired(true))
      .addIntegerOption((o) => o.setName('colocacion').setDescription('Posición (1 = campeón)').setRequired(true).setMinValue(1))),

  new SlashCommandBuilder()
    .setName('config')
    .setDescription('[ADMIN] Configurar canales/ajustes del bot')
    .addSubcommand((s) => s.setName('set').setDescription('Guardar un ajuste')
      .addStringOption((o) => o.setName('clave').setDescription('Clave (ej. channel.announcements)').setRequired(true))
      .addStringOption((o) => o.setName('valor').setDescription('Valor (ID de canal/rol/texto)').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('Listar ajustes configurados')),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistema de tickets')
    .addSubcommand((s) => s.setName('panel').setDescription('[STAFF] Publicar panel de tickets en un canal')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal donde publicar').setRequired(false)))
    .addSubcommand((s) => s.setName('close').setDescription('[STAFF] Cerrar un ticket')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal del ticket').setRequired(true)))
    .addSubcommand((s) => s.setName('claim').setDescription('[STAFF] Reclamar un ticket')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal del ticket').setRequired(true))),
];
