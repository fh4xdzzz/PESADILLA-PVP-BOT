import { SlashCommandBuilder } from 'discord.js';

export const publicBuilders: SlashCommandBuilder[] = [
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Estadísticas PvP de un jugador de Roblox')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId de Roblox (vacío = tu cuenta vinculada)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('top')
    .setDescription('Top jugadores por kills'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Leaderboard global de la experiencia')
    .addStringOption((o) => o.setName('metric').setDescription('Métrica').setRequired(false)
      .addChoices(
        { name: 'Kills', value: 'kills' },
        { name: 'Wins', value: 'wins' },
        { name: 'K/D Ratio', value: 'kd' },
      )),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Tu posición en el ranking (o la de un jugador)')
    .addStringOption((o) => o.setName('usuario').setDescription('Username o UserId de Roblox').setRequired(false)),

  new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Tu perfil de PESADILLA PVP (Discord + Roblox vinculado)'),

  new SlashCommandBuilder()
    .setName('vincular')
    .setDescription('Vincula tu Discord con tu cuenta de Roblox (genera un código)'),

  new SlashCommandBuilder()
    .setName('desvincular')
    .setDescription('Elimina el vínculo Discord ↔ Roblox'),

  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Estado del servidor de juego / hosting'),
];
