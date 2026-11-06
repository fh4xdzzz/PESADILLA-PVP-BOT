const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { resolveRobloxUser, getAvatarUrl } = require('../roblox/users.js');
const { setUserRestriction, removeUserRestriction, getUserRestriction, parseDurationToSeconds } = require('../roblox/restrictions.js');
const { getPlayerStats } = require('../roblox/datastores.js');
const { createCase, getCaseByNumber, listCasesForSubject, addWarn, listWarns, countWarns, updateCaseStatus } = require('../services/cases.js');
const { setPending, consumePending } = require('../services/pending.js');
const { getLinkByRoblox, getLinkByDiscord } = require('../services/linking.js');
const { postToChannel, CHANNEL_KEYS } = require('../services/settings.js');
const { audit } = require('../core/audit.js');
const { hasPermission, canModerate, PERMISSIONS } = require('../core/permissions.js');
const { safeReply, safeError, embedReply } = require('../core/errors.js');
const { BRAND, successEmbed, errorEmbed, caseEmbed } = require('../core/embeds.js');
const { CUSTOM_IDS, confirmButtons } = require('../discord/customIds.js');
const { config } = require('../config.js');
const { log } = require('../logger.js');

function deny(interaction, perm) {
  if (!hasPermission(interaction.user.id, perm)) {
    safeReply(interaction, '⛔ No tienes permisos para este comando.', true);
    return true;
 };
  return false;
}

async function rbanHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const rawUser = interaction.options.getString('usuario', true);
    const duration = interaction.options.getString('duracion');
    const reason = interaction.options.getString('motivo', true);
    const evidence = interaction.options.getString('evidencia');
    const privateNote = interaction.options.getString('nota_privada');
    const propagateAlts = interaction.options.getBoolean('propagar_alts') ?? false;

    const isPerma = !duration || ['perma', 'permanent', 'permanentemente'].includes(duration.toLowerCase());
    if (isPerma && !hasPermission(interaction.user.id, 'PERMA_BAN_ROBLOX')) {
      safeReply(interaction, '⛔ Solo ADMIN/OWNER pueden aplicar baneos permanentes.', true);
      return;
   };
    if (propagateAlts && !hasPermission(interaction.user.id, 'PROPAGATE_ALTS')) {
      safeReply(interaction, '⛔ Solo ADMIN/OWNER pueden propagar a cuentas alternativas.', true);
      return;
   };

    await interaction.deferReply({ ephemeral: true });

    const robloxUser = await resolveRobloxUser(rawUser);
    const durationSec = isPerma ? null : parseDurationToSeconds(duration ?? '1d');
    if (!isPerma && !durationSec) {
      await interaction.editReply({ content: '❌ Duración inválida. Usa ej: 30m, 12h, 7d, 2w.' });
      return;
   };

    const avatar = await getAvatarUrl(robloxUser.id);
    const targetDiscordId = (await getLinkByRoblox(robloxUser.id))?.discordUserId;
    if (targetDiscordId && !canModerate(interaction.user.id, targetDiscordId)) {
      await interaction.editReply({ content: '⛔ No puedes moderar a alguien de tu nivel o superior.' });
      return;
   };

    const expiresAt = durationSec ? new Date(Date.now() + durationSec * 1000) : null;
    const pendingId = `${Date.now()}-${interaction.user.id}`;
    const pending = setPending({
      id: pendingId,
      kind: 'ban',
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      target: robloxUser,
      durationSec,
      reason,
      privateNote,
      evidence,
      propagateAlts,
      expiresAt,
      guildId: interaction.guildId,
    });

    const fields = [
      { name: 'Usuario', value: `**${robloxUser.name}**\nID: \`${robloxUser.id}\`` },
      { name: 'Duración', value: isPerma ? '⛔ Permanente' : `⏱️ ${duration}` },
      { name: 'Motivo', value: reason },
      { name: 'Excluir alts', value: propagateAlts ? '✅ Sí' : '❌ No' },
    ];
    if (evidence) fields.push({ name: 'Evidencia', value: evidence });
    if (privateNote) fields.push({ name: 'Nota privada', value: '*Solo visible para staff*' });

    const embed = new EmbedBuilder()
      .setColor(BRAND.accent)
      .setTitle('🔨 Confirmar baneo')
      .setThumbnail(avatar)
      .addFields(fields)
      .setFooter({ text: `${BRAND.footer} • Actor: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [confirmButtons(pendingId, 'ban')] });
  } catch (err) {
    await safeError(interaction, err, 'rban');
 };
}

async function handleBanConfirm(interaction, action) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const { prisma } = require('../db.js');
    const lastCase = await prisma.case.findFirst({ orderBy: { caseNumber: 'desc' } });
    const caseNumber = (lastCase?.caseNumber ?? 0) + 1;

    let robloxRestrictionId = null;
    let apiError = null;

    try {
      const res = await setUserRestriction({
        userId: action.target.id,
        displayReason: action.reason,
        privateNote: action.privateNote,
        excludeAltAccounts: action.propagateAlts,
        durationSec: action.durationSec,
        idempotencyKey: `case-${caseNumber}`,
      });
      robloxRestrictionId = res.path?.split('/').pop() ?? null;
    } catch (err) {
      apiError = err;
      log.error({ err, target: action.target }, 'Roblox ban API error');
   };

    const status = apiError ? 'FAILED' : 'ACTIVE';
    const kase = await createCase({
      type: 'ROBLOX_BAN',
      subjectId: action.target.id,
      subjectName: action.target.name,
      actorId: action.actorId,
      actorTag: action.actorTag,
      guildId: action.guildId,
      publicReason: action.reason,
      privateNote: action.privateNote,
      evidence: action.evidence,
      durationSec: action.durationSec,
      expiresAt: action.expiresAt,
      robloxRestrictionId,
      propagateAlts: action.propagateAlts,
      metadata: { apiError: apiError?.message },
    });

    await audit({
      actorId: action.actorId,
      action: 'roblox.ban',
      targetType: 'user',
      targetId: action.target.id,
      guildId: action.guildId,
      success: !apiError,
      error: apiError?.message,
      caseId: kase.id,
    });

    const modLogEmbed = caseEmbed([
      { name: 'Caso', value: `#${kase.caseNumber}` },
      { name: 'Tipo', value: 'Baneo Roblox' },
      { name: 'Usuario', value: `**${action.target.name}** (\`${action.target.id}\`)` },
      { name: 'Estado', value: apiError ? '❌ Falló en Roblox' : '✅ Activo' },
      { name: 'Duración', value: action.durationSec ? `${action.durationSec}s` : 'Permanente' },
      { name: 'Motivo', value: action.reason },
      { name: 'Actor', value: `<@${action.actorId}>` },
    ]);

    await postToChannel(interaction.client, CHANNEL_KEYS.registroModeracion, { embeds: [modLogEmbed] });

    if (apiError) {
      await interaction.editReply({ embeds: [errorEmbed(`API de Roblox falló: ${apiError.message}`)] });
    } else {
      await interaction.editReply({ embeds: [successEmbed(`Baneo aplicado. Caso #${kase.caseNumber}`)] });
   };
  } catch (err) {
    await safeError(interaction, err, 'banConfirm');
 };
}

async function handleBanCancel(interaction, action) {
  await interaction.update({ components: [], embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('❌ Baneo cancelado').setFooter({ text: BRAND.footer })] });
}

async function runbanHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const rawUser = interaction.options.getString('usuario', true);
    const reason = interaction.options.getString('motivo', true);
    await interaction.deferReply({ ephemeral: true });

    const robloxUser = await resolveRobloxUser(rawUser);
    const existing = await getUserRestriction(robloxUser.id);
    if (!existing?.gameJoinRestriction?.active) {
      await interaction.editReply({ content: '❌ Ese usuario no tiene un baneo activo.' });
      return;
   };

    await removeUserRestriction(robloxUser.id);
    await createCase({
      type: 'ROBLOX_UNBAN',
      subjectId: robloxUser.id,
      subjectName: robloxUser.name,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      guildId: interaction.guildId,
      publicReason: reason,
    });

    await postToChannel(interaction.client, CHANNEL_KEYS.registroModeracion, {
      embeds: [caseEmbed([
        { name: 'Tipo', value: 'Desbaneo Roblox' },
        { name: 'Usuario', value: `**${robloxUser.name}** (\`${robloxUser.id}\`)` },
        { name: 'Motivo', value: reason },
        { name: 'Actor', value: `<@${interaction.user.id}>` },
      ])],
    });

    await interaction.editReply({ embeds: [successEmbed('Desbaneo aplicado.') ] });
  } catch (err) {
    await safeError(interaction, err, 'runban');
 };
}

async function rbaninfoHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const rawUser = interaction.options.getString('usuario', true);
    await interaction.deferReply({ ephemeral: true });

    const robloxUser = await resolveRobloxUser(rawUser);
    const restriction = await getUserRestriction(robloxUser.id);
    if (!restriction) {
      await interaction.editReply({ content: '❌ Sin restricción activa.' });
      return;
   };

    const r = restriction.gameJoinRestriction;
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(BRAND.color)
        .setTitle('🔒 Restricción activa')
        .addFields(
          { name: 'Usuario', value: `**${robloxUser.name}** (\`${robloxUser.id}\`)` },
          { name: 'Activo', value: r.active ? '✅' : '❌' },
          { name: 'Motivo público', value: r.displayReason ?? 'N/A' },
          { name: 'Duración', value: r.duration ?? 'Permanente' },
          { name: 'Excluir alts', value: r.excludeAltAccounts ? '✅' : '❌' },
        )],
    });
  } catch (err) {
    await safeError(interaction, err, 'rbaninfo');
 };
}

async function rbanlistHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    await interaction.deferReply({ ephemeral: true });

    const { listUserRestrictions } = require('../roblox/restrictions.js');
    const all = await listUserRestrictions(100);
    const active = all.filter((r) => r.gameJoinRestriction?.active).slice(0, 20);

    if (active.length === 0) {
      await interaction.editReply({ content: 'No hay baneos activos.' });
      return;
   };

    const lines = active.map((r) => {
      const u = r.path?.split('/').pop() ?? '?';
      const d = r.gameJoinRestriction?.duration ?? 'perm';
      return `\`${u}\` → ${d}`;
    }).join('\n');

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('📋 Baneos activos').setDescription(lines.slice(0, 4000)).setFooter({ text: `${active.length} mostrados` })] });
  } catch (err) {
    await safeError(interaction, err, 'rbanlist');
 };
}

async function rbanhistoryHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const rawUser = interaction.options.getString('usuario', true);
    await interaction.deferReply({ ephemeral: true });

    const robloxUser = await resolveRobloxUser(rawUser);
    const cases = await listCasesForSubject(robloxUser.id, 10);

    if (cases.length === 0) {
      await interaction.editReply({ content: 'Sin historial.' });
      return;
   };

    const lines = cases.map((c) => `#${c.caseNumber} ${c.type} → ${c.status}`).join('\n');
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle(`Historial de ${robloxUser.name}`).setDescription(lines).setFooter({ text: BRAND.footer })] });
  } catch (err) {
    await safeError(interaction, err, 'rbanhistory');
 };
}

async function rwarnHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const rawUser = interaction.options.getString('usuario', true);
    const reason = interaction.options.getString('motivo', true);
    await interaction.deferReply({ ephemeral: true });

    const robloxUser = await resolveRobloxUser(rawUser);
    const { prisma } = require('../db.js');
    const lastCase = await prisma.case.findFirst({ orderBy: { caseNumber: 'desc' } });
    const caseNumber = (lastCase?.caseNumber ?? 0) + 1;

    const kase = await createCase({
      type: 'ROBLOX_WARN',
      subjectId: robloxUser.id,
      subjectName: robloxUser.name,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      guildId: interaction.guildId,
      publicReason: reason,
    });

    await addWarn(kase.id, robloxUser.id, robloxUser.name, reason, interaction.user.id);

    await postToChannel(interaction.client, CHANNEL_KEYS.registroModeracion, {
      embeds: [caseEmbed([
        { name: 'Caso', value: `#${kase.caseNumber}` },
        { name: 'Tipo', value: 'Advertencia Roblox' },
        { name: 'Usuario', value: `**${robloxUser.name}**` },
        { name: 'Motivo', value: reason },
        { name: 'Actor', value: `<@${interaction.user.id}>` },
      ])],
    });

    await interaction.editReply({ embeds: [successEmbed(`Advertencia registrada. Caso #${kase.caseNumber}`)] });
  } catch (err) {
    await safeError(interaction, err, 'rwarn');
 };
}

async function rwarningsHandler(interaction) {
  try {
    const rawUser = interaction.options.getString('usuario');
    if (!rawUser) {
      const link = await getLinkByDiscord(interaction.user.id);
      if (!link) {
        safeReply(interaction, '❌ No estás vinculado. Usa /vincular.', true);
        return;
     };
      await interaction.deferReply({ ephemeral: true });
      const warns = await listWarns(link.robloxUserId);
      await interaction.editReply({ content: warns.length ? warns.map((w) => `${w.reason} — <t:${Math.floor(w.createdAt/1000)}:R>`).join('\n') : 'Sin advertencias.' });
      return;
   };
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    await interaction.deferReply({ ephemeral: true });
    const robloxUser = await resolveRobloxUser(rawUser);
    const warns = await listWarns(robloxUser.id);
    await interaction.editReply({ content: warns.length ? warns.map((w) => `${w.reason} — <t:${Math.floor(w.createdAt/1000)}:R>`).join('\n') : 'Sin advertencias.' });
  } catch (err) {
    await safeError(interaction, err, 'rwarnings');
 };
}

async function rkickHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const rawUser = interaction.options.getString('usuario', true);
    const reason = interaction.options.getString('motivo', true);
    await interaction.deferReply({ ephemeral: true });

    const robloxUser = await resolveRobloxUser(rawUser);
    await setUserRestriction({
      userId: robloxUser.id,
      displayReason: reason,
      privateNote: 'Kick vía /rkick',
      durationSec: 300,
    });

    await createCase({
      type: 'ROBLOX_KICK',
      subjectId: robloxUser.id,
      subjectName: robloxUser.name,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      guildId: interaction.guildId,
      publicReason: reason,
      durationSec: 300,
    });

    await interaction.editReply({ embeds: [successEmbed('Kick aplicado (5 min de bloqueo).')] });
  } catch (err) {
    await safeError(interaction, err, 'rkick');
 };
}

async function rplayerHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const rawUser = interaction.options.getString('usuario', true);
    await interaction.deferReply({ ephemeral: true });

    const robloxUser = await resolveRobloxUser(rawUser);
    const stats = await getPlayerStats(robloxUser.id);
    const restriction = await getUserRestriction(robloxUser.id);

    const fields = [
      { name: 'Usuario', value: `**${robloxUser.name}** (\`${robloxUser.id}\`)` },
      { name: 'Kills', value: String(stats?.kills ?? 0) },
      { name: 'Deaths', value: String(stats?.deaths ?? 0) },
      { name: 'Wins', value: String(stats?.wins ?? 0) },
      { name: 'Restricción', value: restriction?.gameJoinRestriction?.active ? '✅ Activa' : '❌ Ninguna' },
    ];

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('👤 Perfil').addFields(fields).setFooter({ text: BRAND.footer })] });
  } catch (err) {
    await safeError(interaction, err, 'rplayer');
 };
}

async function rcaseHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const caseNum = interaction.options.getInteger('id', true);
    await interaction.deferReply({ ephemeral: true });

    const kase = await getCaseByNumber(caseNum);
    if (!kase) {
      await interaction.editReply({ content: '❌ Caso no encontrado.' });
      return;
   };

    const fields = [
      { name: 'Caso', value: `#${kase.caseNumber}` },
      { name: 'Tipo', value: kase.type },
      { name: 'Estado', value: kase.status },
      { name: 'Sujeto', value: `${kase.subjectName ?? 'N/A'} (\`${kase.subjectId}\`)` },
      { name: 'Actor', value: `${kase.actorTag ?? 'N/A'} (\`${kase.actorId}\`)` },
      { name: 'Motivo', value: kase.publicReason },
    ];
    if (kase.evidence) fields.push({ name: 'Evidencia', value: kase.evidence });
    if (kase.privateNote) fields.push({ name: 'Nota privada', value: kase.privateNote });

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('📋 Caso').addFields(fields).setTimestamp(kase.createdAt).setFooter({ text: BRAND.footer })] });
  } catch (err) {
    await safeError(interaction, err, 'rcase');
 };
}

async function dbanHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo', true);
    const days = interaction.options.getInteger('dias');

    const target = await interaction.guild.members.fetch(user.id);
    if (!canModerate(interaction.user.id, user.id)) {
      safeReply(interaction, '⛔ No puedes moderar a alguien de tu nivel o superior.', true);
      return;
   };

    if (days) await target.ban({ reason, deleteMessageDays: Math.min(days, 7) });
    else await target.ban({ reason });

    await createCase({
      type: 'DISCORD_BAN',
      subjectId: user.id,
      subjectName: user.tag,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      guildId: interaction.guildId,
      publicReason: reason,
    });

    await audit({ actorId: interaction.user.id, action: 'discord.ban', targetType: 'user', targetId: user.id, guildId: interaction.guildId });
    safeReply(interaction, '✅ Baneo aplicado.', true);
  } catch (err) {
    await safeError(interaction, err, 'dban');
 };
}

async function dunbanHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    const userId = interaction.options.getString('userid', true);
    const reason = interaction.options.getString('motivo');

    await interaction.guild.bans.remove(userId, reason ?? 'Sin motivo');

    await audit({ actorId: interaction.user.id, action: 'discord.unban', targetType: 'user', targetId: userId, guildId: interaction.guildId });
    safeReply(interaction, '✅ Desbaneo aplicado.', true);
  } catch (err) {
    await safeError(interaction, err, 'dunban');
 };
}

async function dwarnHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo', true);

    if (!canModerate(interaction.user.id, user.id)) {
      safeReply(interaction, '⛔ No puedes moderar a alguien de tu nivel o superior.', true);
      return;
   };

    await createCase({
      type: 'DISCORD_WARN',
      subjectId: user.id,
      subjectName: user.tag,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      guildId: interaction.guildId,
      publicReason: reason,
    });

    await audit({ actorId: interaction.user.id, action: 'discord.warn', targetType: 'user', targetId: user.id, guildId: interaction.guildId });
    safeReply(interaction, '✅ Advertencia registrada.', true);
  } catch (err) {
    await safeError(interaction, err, 'dwarn');
 };
}

async function dkickHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo', true);

    const target = await interaction.guild.members.fetch(user.id);
    if (!canModerate(interaction.user.id, user.id)) {
      safeReply(interaction, '⛔ No puedes moderar a alguien de tu nivel o superior.', true);
      return;
   };

    await target.kick(reason);

    await createCase({
      type: 'DISCORD_KICK',
      subjectId: user.id,
      subjectName: user.tag,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      guildId: interaction.guildId,
      publicReason: reason,
    });

    await audit({ actorId: interaction.user.id, action: 'discord.kick', targetType: 'user', targetId: user.id, guildId: interaction.guildId });
    safeReply(interaction, '✅ Expulsión aplicada.', true);
  } catch (err) {
    await safeError(interaction, err, 'dkick');
 };
}

async function dtimeoutHandler(interaction) {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    const user = interaction.options.getUser('usuario', true);
    const minutes = interaction.options.getInteger('minutos', true);
    const reason = interaction.options.getString('motivo');

    const target = await interaction.guild.members.fetch(user.id);
    if (!canModerate(interaction.user.id, user.id)) {
      safeReply(interaction, '⛔ No puedes moderar a alguien de tu nivel o superior.', true);
      return;
   };

    await target.timeout(minutes * 60 * 1000, reason ?? 'Sin motivo');

    await audit({ actorId: interaction.user.id, action: 'discord.timeout', targetType: 'user', targetId: user.id, guildId: interaction.guildId });
    safeReply(interaction, '✅ Timeout aplicado.', true);
  } catch (err) {
    await safeError(interaction, err, 'dtimeout');
 };
}

module.exports = {
  rbanHandler, runbanHandler, rbaninfoHandler, rbanlistHandler, rbanhistoryHandler,
  rwarnHandler, rwarningsHandler, rkickHandler, rplayerHandler, rcaseHandler,
  dbanHandler, dunbanHandler, dwarnHandler, dkickHandler, dtimeoutHandler,
  handleBanConfirm, handleBanCancel,
};
