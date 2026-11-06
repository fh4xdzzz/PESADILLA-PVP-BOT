const { EmbedBuilder } = require('discord.js');
const { resolveRobloxUser } = require('../roblox/users.js');
const { getPlayerStats, getLeaderboard } = require('../roblox/datastores.js');
const { createLinkCode, getLinkByDiscord, removeLink } = require('../services/linking.js');
const { safeReply, safeError } = require('../core/errors.js');
const { BRAND, successEmbed, errorEmbed } = require('../core/embeds.js');
const { config } = require('../config.js');

async function statsHandler(interaction) {
  try {
    const rawUser = interaction.options.getString('usuario');
    let robloxUserId = null;

    if (rawUser) {
      await interaction.deferReply({ ephemeral: false });
      const u = await resolveRobloxUser(rawUser);
      robloxUserId = u.id;
    } else {
      const link = await getLinkByDiscord(interaction.user.id);
      if (!link) {
        safeReply(interaction, '❌ No estás vinculado. Usa /vincular.', true);
        return;
     };
      robloxUserId = link.robloxUserId;
      await interaction.deferReply({ ephemeral: false });
   };

    const stats = await getPlayerStats(robloxUserId);
    if (!stats) {
      await interaction.editReply({ content: '❌ No hay estadísticas para este usuario. La integración Roblox aún no envía datos.' });
      return;
   };

    const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills;
    const fields = [
      { name: 'Kills', value: String(stats.kills ?? 0), inline: true },
      { name: 'Deaths', value: String(stats.deaths ?? 0), inline: true },
      { name: 'K/D', value: kd, inline: true },
      { name: 'Wins', value: String(stats.wins ?? 0), inline: true },
      { name: 'Losses', value: String(stats.losses ?? 0), inline: true },
      { name: 'Matches', value: String(stats.matchesPlayed ?? 0), inline: true },
    ];

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('📊 Estadísticas').addFields(fields).setFooter({ text: BRAND.footer })] });
  } catch (err) {
    await safeError(interaction, err, 'stats');
 };
}

async function topHandler(interaction) {
  try {
    await interaction.deferReply({ ephemeral: false });
    const entries = await getLeaderboard('DESC', 10);
    if (entries.length === 0) {
      await interaction.editReply({ content: '❌ No hay datos en el leaderboard.' });
      return;
   };
    const lines = entries.map((e, i) => `${i + 1}. \`${e.userId}\` — ${e.score} kills`).join('\n');
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('🏆 Top Kills').setDescription(lines).setFooter({ text: BRAND.footer })] });
  } catch (err) {
    await safeError(interaction, err, 'top');
 };
}

async function leaderboardHandler(interaction) {
  try {
    const metric = interaction.options.getString('metric') ?? 'kills';
    await interaction.deferReply({ ephemeral: false });
    const entries = await getLeaderboard('DESC', 20);
    if (entries.length === 0) {
      await interaction.editReply({ content: '❌ No hay datos.' });
      return;
   };
    const lines = entries.map((e, i) => `${i + 1}. \`${e.userId}\` — ${e.score}`).join('\n');
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle(`📊 Leaderboard (${metric})`).setDescription(lines).setFooter({ text: BRAND.footer })] });
  } catch (err) {
    await safeError(interaction, err, 'leaderboard');
 };
}

async function rankHandler(interaction) {
  try {
    const rawUser = interaction.options.getString('usuario');
    let robloxUserId = null;

    if (rawUser) {
      await interaction.deferReply({ ephemeral: false });
      const u = await resolveRobloxUser(rawUser);
      robloxUserId = u.id;
    } else {
      const link = await getLinkByDiscord(interaction.user.id);
      if (!link) {
        safeReply(interaction, '❌ No estás vinculado.', true);
        return;
     };
      robloxUserId = link.robloxUserId;
      await interaction.deferReply({ ephemeral: false });
   };

    const entries = await getLeaderboard('DESC', 1000);
    const rank = entries.findIndex((e) => e.userId === robloxUserId) + 1;
    if (rank === 0) {
      await interaction.editReply({ content: '❌ No aparece en el leaderboard.' });
      return;
   };
    await interaction.editReply({ content: `🏅 Posición en ranking: #${rank}` });
  } catch (err) {
    await safeError(interaction, err, 'rank');
 };
}

async function perfilHandler(interaction) {
  try {
    const link = await getLinkByDiscord(interaction.user.id);
    if (!link) {
      safeReply(interaction, '❌ No estás vinculado. Usa /vincular.', true);
      return;
   };
    await interaction.deferReply({ ephemeral: false });

    const stats = await getPlayerStats(link.robloxUserId);
    const fields = [
      { name: 'Roblox', value: `**${link.robloxName ?? 'N/A'}** (\`${link.robloxUserId}\`)` },
      { name: 'Vinculado', value: `<t:${Math.floor(link.verifiedAt / 1000)}:R>` },
    ];
    if (stats) {
      fields.push(
        { name: 'Kills', value: String(stats.kills ?? 0), inline: true },
        { name: 'Deaths', value: String(stats.deaths ?? 0), inline: true },
        { name: 'Wins', value: String(stats.wins ?? 0), inline: true },
      );
   };

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('👤 Tu perfil').addFields(fields).setFooter({ text: BRAND.footer })] });
  } catch (err) {
    await safeError(interaction, err, 'perfil');
 };
}

async function vincularHandler(interaction) {
  try {
    const code = await createLinkCode(interaction.user.id);
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(BRAND.color)
        .setTitle('🔗 Vincular cuenta')
        .setDescription(`Entra a PESADILLA PVP en Roblox y ejecuta:\n\`/vincular ${code.code}\`\n\nEste código expira en 10 minutos.`)
        .setFooter({ text: BRAND.footer })],
      ephemeral: true,
    });
  } catch (err) {
    await safeError(interaction, err, 'vincular');
 };
}

async function desvincularHandler(interaction) {
  try {
    await removeLink(interaction.user.id);
    await interaction.reply({ embeds: [successEmbed('Vínculo eliminado.')], ephemeral: true });
  } catch (err) {
    await safeError(interaction, err, 'desvincular');
 };
}

async function serverHandler(interaction) {
  try {
    const link = await getLinkByDiscord(interaction.user.id);
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(BRAND.color)
        .setTitle('🟢 Estado del servidor')
        .setDescription('✅ Todos los sistemas operativos.')
        .addFields(link ? [{ name: 'Tu cuenta', value: link.robloxName ?? 'N/A' }] : [])
        .setFooter({ text: BRAND.footer })
        .setTimestamp()],
      ephemeral: false,
    });
  } catch (err) {
    await safeError(interaction, err, 'server');
 };
}

module.exports = {
  statsHandler, topHandler, leaderboardHandler, rankHandler, perfilHandler,
  vincularHandler, desvincularHandler, serverHandler,
};
