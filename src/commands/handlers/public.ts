import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { safeReply, safeError } from '../../core/errors.js';
import { BRAND, errorEmbed } from '../../core/embeds.js';
import { resolveRobloxUser, getAvatarUrl } from '../../roblox/users.js';
import { getPlayerStats, getLeaderboard, listAllPlayerStats } from '../../roblox/datastores.js';
import { createLinkCode, getLinkByDiscord, removeLink } from '../../services/linking.js';
import { getSetting } from '../../services/settings.js';
import { log } from '../../logger.js';

const STATS_PENDING = '📊 La integración de estadísticas está pendiente: el juego aún no envía datos al backend. Los datos aparecerán cuando se active la instrumentación en Roblox Studio.';

async function resolveTargetRobloxId(interaction: ChatInputCommandInteraction): Promise<string | null> {
  const input = interaction.options.getString('usuario');
  if (input) {
    const u = await resolveRobloxUser(input);
    return String(u.id);
  }
  const link = await prisma.playerLink.findUnique({ where: { discordUserId: interaction.user.id } });
  return link?.robloxUserId ?? null;
}

export async function statsHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: false });
    const robloxId = await resolveTargetRobloxId(interaction);
    if (!robloxId) {
      await interaction.editReply({ embeds: [errorEmbed('No se especificó usuario y no tienes cuenta Roblox vinculada. Usa `/vincular`.')] });
      return;
    }
    let name = robloxId;
    try { name = (await resolveRobloxUser(robloxId)).name; } catch { /* usar id */ }
    const stats = config.roblox.configured ? await getPlayerStats(robloxId).catch(() => null) : null;
    const avatar = await getAvatarUrl(robloxId);

    const embed = new EmbedBuilder().setColor(BRAND.color).setTitle(`📊 Stats — ${name}`).setThumbnail(avatar ?? null);
    if (stats) {
      const s = stats as Record<string, number>;
      const kd = (s.kills ?? 0) / Math.max(1, s.deaths ?? 1);
      embed.addFields(
        { name: 'Kills', value: String(s.kills ?? 0), inline: true },
        { name: 'Deaths', value: String(s.deaths ?? 0), inline: true },
        { name: 'K/D', value: kd.toFixed(2), inline: true },
        { name: 'Wins', value: String(s.wins ?? 0), inline: true },
        { name: 'Losses', value: String(s.losses ?? 0), inline: true },
        { name: 'Racha actual', value: String(s.currentStreak ?? 0), inline: true },
        { name: 'Mejor racha', value: String(s.bestStreak ?? 0), inline: true },
        { name: 'Partidas', value: String(s.matchesPlayed ?? 0), inline: true },
      );
    } else {
      embed.setDescription(STATS_PENDING);
    }
    embed.setFooter({ text: BRAND.footer }).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) { await safeError(interaction, err, 'stats'); }
}

export async function topHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: false });
    const board = config.roblox.configured ? await getLeaderboard('DESC', 10).catch(() => []) : [];
    const embed = new EmbedBuilder().setColor(BRAND.color).setTitle('🏆 Top — Kills').setFooter({ text: BRAND.footer });
    if (!board.length) {
      embed.setDescription(STATS_PENDING);
    } else {
      const lines: string[] = [];
      for (let i = 0; i < board.length; i++) {
        const e = board[i];
        let name = e.userId;
        try { name = (await resolveRobloxUser(e.userId)).name; } catch { /* keep id */ }
        lines.push(`**${i + 1}.** ${name} — ${e.score} kills`);
      }
      embed.setDescription(lines.join('\n'));
    }
    await interaction.editReply({ embeds: [embed] });
  } catch (err) { await safeError(interaction, err, 'top'); }
}

export async function leaderboardHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: false });
    const metric = interaction.options.getString('metric') ?? 'kills';
    const embed = new EmbedBuilder().setColor(BRAND.color).setTitle(`🏆 Leaderboard — ${metric.toUpperCase()}`).setFooter({ text: BRAND.footer });

    const entries = config.roblox.configured ? await listAllPlayerStats(100).catch(() => []) : [];
    if (!entries.length) {
      embed.setDescription(STATS_PENDING);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const scored = entries
      .map((e) => {
        const v = (typeof e.value === 'string' ? JSON.parse(e.value || '{}') : e.value) as Record<string, number>;
        const score = metric === 'wins' ? (v.wins ?? 0) : metric === 'kd' ? (v.kills ?? 0) / Math.max(1, v.deaths ?? 1) : (v.kills ?? 0);
        return { userId: e.key, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const lines: string[] = [];
    for (let i = 0; i < scored.length; i++) {
      let name = scored[i].userId;
      try { name = (await resolveRobloxUser(scored[i].userId)).name; } catch { /* keep */ }
      lines.push(`**${i + 1}.** ${name} — ${metric === 'kd' ? scored[i].score.toFixed(2) : scored[i].score}`);
    }
    embed.setDescription(lines.join('\n'));
    await interaction.editReply({ embeds: [embed] });
  } catch (err) { await safeError(interaction, err, 'leaderboard'); }
}

export async function rankHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    const robloxId = await resolveTargetRobloxId(interaction);
    if (!robloxId) {
      await interaction.editReply({ embeds: [errorEmbed('No tienes cuenta vinculada ni especificaste usuario.')] });
      return;
    }
    const entries = config.roblox.configured ? await listAllPlayerStats(200).catch(() => []) : [];
    if (!entries.length) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setDescription(STATS_PENDING).setFooter({ text: BRAND.footer })] });
      return;
    }
    const sorted = entries
      .map((e) => {
        const v = (typeof e.value === 'string' ? JSON.parse(e.value || '{}') : e.value) as Record<string, number>;
        return { userId: e.key, kills: v.kills ?? 0 };
      })
      .sort((a, b) => b.kills - a.kills);
    const idx = sorted.findIndex((e) => e.userId === robloxId);
    if (idx === -1) {
      await interaction.editReply({ content: 'Este jugador aún no tiene estadísticas registradas.' });
      return;
    }
    await interaction.editReply({ content: `🏆 Tu rango por kills: **#${idx + 1}** de ${sorted.length} jugadores.` });
  } catch (err) { await safeError(interaction, err, 'rank'); }
}

export async function perfilHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    const link = await prisma.playerLink.findUnique({ where: { discordUserId: interaction.user.id } });
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`👤 ${interaction.user.tag}`)
      .setThumbnail(interaction.user.displayAvatarURL());

    if (link) {
      let rName = link.robloxName ?? link.robloxUserId;
      try { rName = (await resolveRobloxUser(link.robloxUserId)).name; } catch { /* keep */ }
      embed.addFields(
        { name: 'Discord', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Roblox', value: `@${rName} (\`${link.robloxUserId}\`)`, inline: true },
        { name: 'Vinculado', value: link.verifiedAt.toISOString().slice(0, 10), inline: true },
      );
    } else {
      embed.setDescription('No tienes cuenta de Roblox vinculada.\nUsa `/vincular` para conectar tu cuenta.');
    }
    embed.setFooter({ text: BRAND.footer }).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) { await safeError(interaction, err, 'perfil'); }
}

export async function vincularHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    const existing = await getLinkByDiscord(interaction.user.id);
    if (existing) {
      await interaction.editReply({ content: 'Ya tienes una cuenta vinculada. Usa `/desvincular` primero si quieres cambiarla.' });
      return;
    }
    const lc = await createLinkCode(interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('🔗 Vincular cuenta de Roblox')
      .setDescription(
        `Tu código de vinculación es:\n\`\`\`${lc.code}\`\`\`\n\n` +
        `**Pasos:**\n1. Abre PESADILLA PVP en Roblox\n2. En el juego, ejecuta el comando de vinculación e ingresa este código\n3. Vuelve aquí — tu cuenta quedará conectada`,
      )
      .setFooter({ text: `El código expira en 10 minutos • ${BRAND.footer}` });
    await interaction.editReply({ embeds: [embed] });
  } catch (err) { await safeError(interaction, err, 'vincular'); }
}

export async function desvincularHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    const res = await removeLink(interaction.user.id);
    await interaction.editReply({
      content: res.count > 0 ? '✅ Cuenta desvinculada.' : 'No tenías ninguna cuenta vinculada.',
    });
  } catch (err) { await safeError(interaction, err, 'desvincular'); }
}

export async function serverHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: false });
    const gameLink = await getSetting('config.game-link');
    const statusText = await getSetting('config.status-text');
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('🖥️ Servidor')
      .addFields(
        { name: 'Experiencia', value: gameLink ?? 'Roblox — PESADILLA PVP', inline: false },
        { name: 'Estado', value: statusText ?? 'Consulta el canal 📢status para el estado actual.', inline: false },
      )
      .setFooter({ text: BRAND.footer })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) { await safeError(interaction, err, 'server'); }
}
