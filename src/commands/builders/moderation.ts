import { SlashCommandBuilder } from 'discord.js';

const userOpt = (name: string, description: string, required = true) =>
  new SlashCommandBuilder().setName(name).setDescription(description)
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId de Roblox (o mención de Discord)').setRequired(required));

export const moderationBuilders: SlashCommandBuilder[] = [
  new SlashCommandBuilder()
    .setName('rban')
    .setDescription('[STAFF] Banea un usuario de la experiencia Roblox')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId de Roblox').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo público del baneo').setRequired(true))
    .addStringOption((o) => o.setName('duracion').setDescription('Temporal: 30m, 12h, 7d, 2w — vacío = permanente').setRequired(false))
    .addStringOption((o) => o.setName('evidencia').setDescription('Enlace/captura de evidencia').setRequired(false))
    .addStringOption((o) => o.setName('nota_privada').setDescription('Nota privada (solo staff)').setRequired(false))
    .addBooleanOption((o) => o.setName('propagar_alts').setDescription('[ADMIN] Propagar a cuentas alternativas detectadas').setRequired(false)),

  new SlashCommandBuilder()
    .setName('runban')
    .setDescription('[STAFF] Revoca un baneo de Roblox')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId de Roblox').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo de la revocación').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rbaninfo')
    .setDescription('[STAFF] Estado actual de restricción de un usuario')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rbanlist')
    .setDescription('[STAFF] Lista los baneos activos en Roblox'),

  new SlashCommandBuilder()
    .setName('rbanhistory')
    .setDescription('[STAFF] Historial de casos de un usuario')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rwarn')
    .setDescription('[STAFF] Registra una advertencia a un jugador')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo de la advertencia').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rwarnings')
    .setDescription('Ver advertencias de un jugador')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(false)),

  new SlashCommandBuilder()
    .setName('rkick')
    .setDescription('[STAFF] Expulsa a un jugador de la experiencia (kick de sesión)')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rplayer')
    .setDescription('[STAFF] Perfil de un jugador de Roblox (ID, nombre, restricción)')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId').setRequired(true)),

  new SlashCommandBuilder()
    .setName('rcase')
    .setDescription('[STAFF] Ver un caso de moderación por número')
    .addIntegerOption((o) => o.setName('id').setDescription('Número de caso').setRequired(true)
      .setMinValue(1)),

  // --- Moderación Discord ---
  new SlashCommandBuilder()
    .setName('dban')
    .setDescription('[STAFF] Banea un miembro del Discord')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true))
    .addIntegerOption((o) => o.setName('dias').setDescription('Duración en días (vacío = permanente)').setRequired(false)
      .setMinValue(1).setMaxValue(3650)),

  new SlashCommandBuilder()
    .setName('dunban')
    .setDescription('[STAFF] Desbanea un usuario de Discord (por ID)')
    .addStringOption((o) => o.setName('userid').setDescription('ID de Discord del usuario').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false)),

  new SlashCommandBuilder()
    .setName('dwarn')
    .setDescription('[STAFF] Advertencia de Discord')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dkick')
    .setDescription('[STAFF] Expulsa un miembro del Discord')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dtimeout')
    .setDescription('[STAFF] Timeout de Discord')
    .addUserOption((o) => o.setName('usuario').setDescription('Miembro').setRequired(true))
    .addIntegerOption((o) => o.setName('minutos').setDescription('Duración en minutos (máx 40320)').setRequired(true)
      .setMinValue(1).setMaxValue(40320))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false)),
];
