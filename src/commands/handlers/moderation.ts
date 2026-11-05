import {
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { randomUUID } from 'node:crypto';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { audit } from '../../core/audit.js';
import { hasPermission, canModerate, getStaffLevel, PERMISSIONS } from '../../core/permissions.js';
import { safeReply, safeError } from '../../core/errors.js';
import { errorEmbed, successEmbed, caseEmbed, warnEmbed, BRAND } from '../../core/embeds.js';
import { resolveRobloxUser, getAvatarUrl, getUserById } from '../../roblox/users.js';
import {
  setUserRestriction,
  removeUserRestriction,
  getUserRestriction,
  parseDurationToSeconds,
  listUserRestrictions,
} from '../../roblox/restrictions.js';
import { getPlayerStats } from '../../roblox/datastores.js';
import { createCase, getCaseByNumber, listCasesForSubject, listActiveBans, updateCaseStatus, addWarn, listWarns, countWarns } from '../../services/cases.js';
import { setPending, getPending, consumePending } from '../../services/pending.js';
import { postToChannel, CHANNEL_KEYS } from '../../services/settings.js';
import { log } from '../../logger.js';
import { CUSTOM_IDS, confirmButtons } from '../../discord/customIds.js';
import type { PendingAction } from '../../services/pending.js';

function requireRoblox() {
  if (!config.roblox.configured) {
    throw new Error('Roblox Open Cloud no está configurado (ROBLOX_API_KEY / ROBLOX_UNIVERSE_ID).');
  }
}

function deny(interaction: ChatInputCommandInteraction, perm: keyof typeof PERMISSIONS): boolean {
  if (!hasPermission(interaction.user.id, perm)) {
    void safeReply(interaction, '⛔ No tienes permisos para este comando.', true);
    return true;
  }
  return false;
}

function fmtDuration(sec?: number | null): string {
  if (!sec) return 'Permanente';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m`;
}

function fmtDate(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

// ===================== RBAN =====================

export async function rbanHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    requireRoblox();
    if (deny(interaction, 'MODERATION_ROBLOX')) return;

    const input = interaction.options.getString('usuario', true);
    const durationInput = interaction.options.getString('duracion');
    const reason = interaction.options.getString('motivo', true);
    const evidence = interaction.options.getString('evidencia');
    const privateNote = interaction.options.getString('nota_privada');
    const propagateAlts = interaction.options.getBoolean('propagar_alts') ?? false;

    // Resolución username → UserId
    await interaction.deferReply({ ephemeral: true });
    const user = await resolveRobloxUser(input);

    // Parsear duración
    let durationSec: number | null = null;
    if (durationInput && !/^(perm|permanent|permanente)$/i.test(durationInput)) {
      const secs = parseDurationToSeconds(durationInput);
      if (!secs) {
        await safeReply(interaction, `Duración inválida "${durationInput}". Usa formato como 30m, 12h, 7d, 2w o vacío para permanente.`, true);
        return;
      }
      if (secs > 315_576_000_000) {
        await safeReply(interaction, 'La duración excede el máximo permitido por Roblox (~10,000 años).', true);
        return;
      }
      durationSec = secs;
    }

    // Protección de jerarquía
    const link = await prisma.playerLink.findUnique({ where: { robloxUserId: String(user.id) } });
    if (link && !canModerate(interaction.user.id, link.discordUserId)) {
      await safeReply(interaction, '⛔ No puedes sancionar a un miembro de staff de tu nivel o superior.', true);
      return;
    }

    // Permisos reforzados para permanentes y propagación
    if (!durationSec && !hasPermission(interaction.user.id, 'PERMA_BAN_ROBLOX')) {
      await safeReply(interaction, '🔒 Los baneos permanentes requieren permiso de ADMIN u OWNER. Usa una duración temporal o pide a un admin.', true);
      return;
    }
    if (propagateAlts && !hasPermission(interaction.user.id, 'PROPAGATE_ALTS')) {
      await safeReply(interaction, '🔒 La propagación a cuentas alternativas requiere permiso de ADMIN u OWNER.', true);
      return;
    }

    // Crear caso PENDING (idempotencia: su id será la idempotencyKey del PATCH)
    const pendingCase = await createCase({
      type: 'ROBLOX_BAN',
      status: 'PENDING',
      subjectId: String(user.id),
      subjectName: user.name,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      guildId: interaction.guildId,
      publicReason: reason,
      privateNote: privateNote ?? undefined,
      evidence: evidence ?? undefined,
      durationSec,
      propagateAlts,
      expiresAt: durationSec ? new Date(Date.now() + durationSec * 1000) : null,
    });

    const actionId = randomUUID();
    setPending({
      id: actionId,
      type: 'ROBLOX_BAN',
      actorId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: String(user.id),
      userName: user.name,
      displayName: user.displayName,
      durationSec,
      publicReason: reason,
      privateNote: privateNote ?? undefined,
      evidence: evidence ?? undefined,
      propagateAlts,
      caseId: pendingCase.id,
    });

    const avatar = await getAvatarUrl(user.id);
    const embed = new EmbedBuilder()
      .setColor(BRAND.accent)
      .setTitle('🔨 Confirmar baneo de Roblox')
      .setThumbnail(avatar ?? null)
      .addFields(
        { name: 'Usuario', value: `**${user.displayName}** (@${user.name})\nID: \`${user.id}\``, inline: true },
        { name: 'Duración', value: fmtDuration(durationSec), inline: true },
        { name: 'Caso', value: `#${pendingCase.caseNumber}`, inline: true },
        { name: 'Motivo', value: reason.slice(0, 1024) },
      )
      .setFooter({ text: `${BRAND.footer} • Expira en 5 min` })
      .setTimestamp();
    if (privateNote) embed.addFields({ name: '🔒 Nota privada', value: privateNote.slice(0, 1024) });
    if (evidence) embed.addFields({ name: '📎 Evidencia', value: evidence.slice(0, 1024) });
    if (propagateAlts) embed.addFields({ name: '⚠️ Propagación', value: 'Se aplicará a cuentas alternativas detectadas por Roblox.', inline: true });

    await interaction.editReply({
      embeds: [embed],
      components: [confirmButtons(actionId, 'ban')],
    });
  } catch (err) {
    await safeError(interaction, err, 'rban');
  }
}

// ===================== RUNBAN =====================

export async function runbanHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    requireRoblox();
    if (deny(interaction, 'MODERATION_ROBLOX')) return;

    const input = interaction.options.getString('usuario', true);
    const reason = interaction.options.getString('motivo', true);

    await interaction.deferReply({ ephemeral: true });
    const user = await resolveRobloxUser(input);

    const restriction = await getUserRestriction(String(user.id));
    if (!restriction?.gameJoinRestriction?.active) {
      await safeReply(interaction, `ℹ️ ${user.name} no tiene una restricción activa en la experiencia.`, true);
      return;
    }

    const actionId = randomUUID();
    setPending({
      id: actionId,
      type: 'ROBLOX_UNBAN',
      actorId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: String(user.id),
      userName: user.name,
      displayName: user.displayName,
      publicReason: reason,
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Confirmar desbaneo de Roblox')
      .addFields(
        { name: 'Usuario', value: `**${user.displayName}** (@${user.name})\nID: \`${user.id}\``, inline: true },
        { name: 'Motivo', value: reason.slice(0, 1024) },
        { name: 'Nota', value: 'Se revocará la restricción gameJoin activa en la universe.' },
      )
      .setFooter({ text: `${BRAND.footer} • Expira en 5 min` })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      components: [confirmButtons(actionId, 'unban')],
    });
  } catch (err) {
    await safeError(interaction, err, 'runban');
  }
}

// ===================== RBANINFO =====================

export async function rbaninfoHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    requireRoblox();
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const input = interaction.options.getString('usuario', true);
    await interaction.deferReply({ ephemeral: true });
    const user = await resolveRobloxUser(input);
    const restriction = await getUserRestriction(String(user.id));
    const active = restriction?.gameJoinRestriction?.active ?? false;
    const r = restriction?.gameJoinRestriction;

    const embed = caseEmbed([
      { name: 'Usuario', value: `**${user.displayName}** (@${user.name}) — \`${user.id}\``, inline: false },
      { name: 'Restricción activa', value: active ? '🔴 SÍ' : '🟢 No', inline: true },
      { name: 'Motivo visible', value: r?.displayReason ?? '—', inline: false },
      { name: 'Motivo privado', value: r?.privateReason ?? '—', inline: false },
      { name: 'Duración', value: r?.duration ?? (active ? 'Permanente' : '—'), inline: true },
      { name: 'Alt accounts excluidas', value: r?.excludeAltAccounts ? 'Sí' : 'No', inline: true },
      { name: 'Actualizado', value: fmtDate(restriction?.updateTime), inline: true },
    ], `👤 Estado de ${user.name}`);

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await safeError(interaction, err, 'rbaninfo');
  }
}

// ===================== RBANLIST =====================

export async function rbanlistHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    requireRoblox();
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    await interaction.deferReply({ ephemeral: true });

    const [robloxBans, localCases] = await Promise.all([
      listUserRestrictions(50).catch(() => [] as Awaited<ReturnType<typeof listUserRestrictions>>),
      listActiveBans(),
    ]);

    const activeRoblox = robloxBans.filter((r) => r.gameJoinRestriction?.active);
    const lines = activeRoblox.slice(0, 15).map((r) => {
      const uid = (r.user ?? '').split('/').pop();
      return `• \`${uid}\` — ${r.gameJoinRestriction?.displayReason ?? 'sin motivo'} (${fmtDate(r.updateTime)})`;
    });

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('📜baneos activos — Roblox')
      .setDescription(
        lines.length
          ? lines.join('\n') + (activeRoblox.length > 15 ? `\n\n_...y ${activeRoblox.length - 15} más_` : '')
          : 'No hay restricciones activas en la universe.',
      )
      .addFields({ name: 'Casos locales activos', value: String(localCases.length), inline: true })
      .setFooter({ text: BRAND.footer })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await safeError(interaction, err, 'rbanlist');
  }
}

// ===================== RBANHISTORY =====================

export async function rbanhistoryHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const input = interaction.options.getString('usuario', true);
    await interaction.deferReply({ ephemeral: true });

    let subjectId = input;
    if (!/^\d+$/.test(input)) {
      try {
        const u = await resolveRobloxUser(input);
        subjectId = String(u.id);
      } catch {
        subjectId = input; // buscar por nombre guardado
      }
    }

    const cases = await listCasesForSubject(subjectId, 10);
    const warns = await listWarns(subjectId);

    if (cases.length === 0 && warns.length === 0) {
      await safeReply(interaction, `No hay casos registrados para ${input}.`, true);
      return;
    }

    const lines = cases.map((c) =>
      `**#${c.caseNumber}** ${c.type} — ${c.publicReason.slice(0, 60)} — ${fmtDate(c.createdAt)} (${c.status})`,
    );

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`📁 Historial — ${input}`)
      .setDescription(lines.slice(0, 10).join('\n') || 'Sin casos.')
      .addFields({ name: 'Advertencias', value: String(warns.length), inline: true })
      .setFooter({ text: BRAND.footer })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await safeError(interaction, err, 'rbanhistory');
  }
}

// ===================== RWARN / RWARNINGS =====================

export async function rwarnHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const input = interaction.options.getString('usuario', true);
    const reason = interaction.options.getString('motivo', true);
    await interaction.deferReply({ ephemeral: true });

    let userId = input;
    let userName = input;
    if (!/^\d+$/.test(input)) {
      const u = await resolveRobloxUser(input);
      userId = String(u.id);
      userName = u.name;
    }

    const warn = await addWarn(null, userId, userName, reason, interaction.user.id);
    await audit({ actorId: interaction.user.id, action: 'roblox.warn', targetType: 'robloxUser', targetId: userId, guildId: interaction.guildId, metadata: { reason } });

    await postToChannel(interaction.client as unknown as Client, CHANNEL_KEYS.registroModeracion, {
      embeds: [caseEmbed([
        { name: '⚠️ Advertencia', value: `**#${warn.id.slice(-6)}** — ${userName} (\`${userId}\`)` },
        { name: 'Motivo', value: reason },
        { name: 'Moderador', value: `<@${interaction.user.id}>` },
      ], 'Registro de moderación')],
    });

    await interaction.editReply({ embeds: [successEmbed(`Advertencia registrada para **${userName}**.`)] });
  } catch (err) {
    await safeError(interaction, err, 'rwarn');
  }
}

export async function rwarningsHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const input = interaction.options.getString('usuario');
    if (!input) {
      // Ver las propias (vía link de Discord)
      const link = await prisma.playerLink.findUnique({ where: { discordUserId: interaction.user.id } });
      if (!link) {
        await safeReply(interaction, 'No tienes cuenta vinculada. Usa `/vincular` primero o especifica un usuario.', true);
        return;
      }
      const warns = await listWarns(link.robloxUserId);
      await replyWarns(interaction, link.robloxUserId, link.robloxName ?? link.robloxUserId, warns);
      return;
    }

    let userId = input;
    let userName = input;
    if (!/^\d+$/.test(input)) {
      try {
        const u = await resolveRobloxUser(input);
        userId = String(u.id);
        userName = u.name;
      } catch { /* usar input tal cual */ }
    }
    const warns = await listWarns(userId);
    await replyWarns(interaction, userId, userName, warns);
  } catch (err) {
    await safeError(interaction, err, 'rwarnings');
  }
}

async function replyWarns(
  interaction: ChatInputCommandInteraction,
  userId: string,
  userName: string,
  warns: Awaited<ReturnType<typeof listWarns>>,
) {
  const embed = new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle(`⚠️ Advertencias — ${userName}`)
    .setDescription(
      warns.length
        ? warns.map((w) => `• ${w.reason} — ${fmtDate(w.createdAt)}`).join('\n')
        : 'Sin advertencias registradas.',
    )
    .setFooter({ text: BRAND.footer })
    .setTimestamp();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ===================== RKICK =====================

export async function rkickHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    requireRoblox();
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const input = interaction.options.getString('usuario', true);
    const reason = interaction.options.getString('motivo', true);

    await interaction.deferReply({ ephemeral: true });
    const user = await resolveRobloxUser(input);

    // Kick en Roblox Open Cloud: no existe endpoint directo de "kick" en tiempo real.
    // Se registra como caso + se aplica una restricción de corta duración si se desea.
    // Documentado: el kick efectivo lo hace el juego (Players:Kick) o una restricción breve.
    const actionId = randomUUID();
    const pendingCase = await createCase({
      type: 'ROBLOX_KICK',
      status: 'PENDING',
      subjectId: String(user.id),
      subjectName: user.name,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      guildId: interaction.guildId,
      publicReason: reason,
    });
    setPending({
      id: actionId,
      type: 'ROBLOX_KICK',
      actorId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: String(user.id),
      userName: user.name,
      displayName: user.displayName,
      publicReason: reason,
      caseId: pendingCase.id,
      durationSec: 300, // kick = restricción de 5 min como equivalente funcional
    });

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('👢 Confirmar expulsión (kick)')
      .addFields(
        { name: 'Usuario', value: `**${user.displayName}** (@${user.name}) — \`${user.id}\`` },
        { name: 'Motivo', value: reason },
        { name: 'Nota', value: 'Roblox Open Cloud no expone "kick" directo; se aplicará una restricción de juego de 5 minutos equivalente.' },
      )
      .setFooter({ text: `${BRAND.footer} • Expira en 5 min` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [confirmButtons(actionId, 'kick')] });
  } catch (err) {
    await safeError(interaction, err, 'rkick');
  }
}

// ===================== RPLAYER =====================

export async function rplayerHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const input = interaction.options.getString('usuario', true);
    await interaction.deferReply({ ephemeral: true });
    const user = await resolveRobloxUser(input);
    const avatar = await getAvatarUrl(user.id);
    const stats = config.roblox.configured ? await getPlayerStats(String(user.id)).catch(() => null) : null;
    const warns = await countWarns(String(user.id));

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`👤 ${user.displayName}`)
      .setThumbnail(avatar ?? null)
      .addFields(
        { name: 'Username', value: `@${user.name}`, inline: true },
        { name: 'UserId', value: `\`${user.id}\``, inline: true },
        { name: 'Advertencias', value: String(warns), inline: true },
      );

    if (stats) {
      const s = stats as Record<string, number>;
      embed.addFields(
        { name: 'Kills', value: String(s.kills ?? 0), inline: true },
        { name: 'Deaths', value: String(s.deaths ?? 0), inline: true },
        { name: 'Wins', value: String(s.wins ?? 0), inline: true },
        { name: 'K/D', value: String(((s.kills ?? 0) / Math.max(1, s.deaths ?? 1)).toFixed(2)), inline: true },
      );
    } else {
      embed.addFields({ name: 'Estadísticas', value: '📊 Integración de stats pendiente (el juego aún no envía datos).' });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await safeError(interaction, err, 'rplayer');
  }
}

// ===================== RCASE =====================

export async function rcaseHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (deny(interaction, 'MODERATION_ROBLOX')) return;
    const id = interaction.options.getInteger('id', true);
    await interaction.deferReply({ ephemeral: true });

    const c = await getCaseByNumber(id);
    if (!c) {
      await safeReply(interaction, `No existe el caso #${id}.`, true);
      return;
    }

    const embed = caseEmbed([
      { name: 'Caso', value: `#${c.caseNumber}`, inline: true },
      { name: 'Tipo', value: c.type, inline: true },
      { name: 'Estado', value: c.status, inline: true },
      { name: 'Sujeto', value: `${c.subjectName ?? '?'} — \`${c.subjectId}\``, inline: true },
      { name: 'Moderador', value: `<@${c.actorId}>`, inline: true },
      { name: 'Fecha', value: fmtDate(c.createdAt), inline: true },
      { name: 'Motivo público', value: c.publicReason },
      { name: 'Nota privada', value: c.privateNote ?? '—' },
      { name: 'Evidencia', value: c.evidence ?? '—' },
      { name: 'Duración', value: fmtDuration(c.durationSec) },
      { name: 'Expira', value: fmtDate(c.expiresAt) },
    ], `📋 Caso #${c.caseNumber}`);

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await safeError(interaction, err, 'rcase');
  }
}

// ===================== MODERACIÓN DISCORD =====================

async function requireGuild(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) throw new Error('Este comando solo funciona dentro de un servidor.');
  if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
    throw new Error('El bot no tiene permiso de moderación en este servidor.');
  }
  return interaction.guild;
}

export async function dbanHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    const guild = await requireGuild(interaction);
    const member = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('motivo', true);
    const days = interaction.options.getInteger('dias');
    if (!member || typeof member === 'string') throw new Error('Miembro no encontrado.');
    if (!canModerate(interaction.user.id, member.id)) {
      await safeReply(interaction, '⛔ No puedes moderar a un miembro de staff de tu nivel o superior.', true);
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await member.ban({ reason: `${reason} — por ${interaction.user.tag}`, deleteMessageSeconds: days ? 0 : 604800 });

    const c = await createCase({
      type: 'DISCORD_BAN', subjectId: member.id, subjectName: member.user.tag,
      actorId: interaction.user.id, actorTag: interaction.user.tag, guildId: guild.id,
      publicReason: reason, durationSec: days ? days * 86400 : null,
      expiresAt: days ? new Date(Date.now() + days * 86400 * 1000) : null,
    });
    await audit({ actorId: interaction.user.id, action: 'discord.ban', targetType: 'discordUser', targetId: member.id, guildId: guild.id, caseId: c.id });
    await postToChannel(interaction.client as unknown as Client, CHANNEL_KEYS.registroModeracion, {
      embeds: [caseEmbed([
        { name: '🔨 Discord Ban', value: `<@${member.id}> (\`${member.id}\`)` },
        { name: 'Motivo', value: reason },
        { name: 'Duración', value: days ? `${days} días` : 'Permanente' },
        { name: 'Caso', value: `#${c.caseNumber}` },
      ])],
    });
    await interaction.editReply({ embeds: [successEmbed(`<@${member.id}> baneado del servidor.`)] });
  } catch (err) { await safeError(interaction, err, 'dban'); }
}

export async function dunbanHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    const guild = await requireGuild(interaction);
    const userId = interaction.options.getString('userid', true).trim();
    const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
    if (!/^\d{5,25}$/.test(userId)) throw new Error('ID de Discord inválido.');
    await interaction.deferReply({ ephemeral: true });
    await guild.bans.remove(userId, reason);
    await audit({ actorId: interaction.user.id, action: 'discord.unban', targetType: 'discordUser', targetId: userId, guildId: guild.id });
    await interaction.editReply({ embeds: [successEmbed(`Usuario \`${userId}\` desbaneado.`)] });
  } catch (err) { await safeError(interaction, err, 'dunban'); }
}

export async function dwarnHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    const member = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('motivo', true);
    if (!member || typeof member === 'string') throw new Error('Miembro no encontrado.');
    await interaction.reply({ embeds: [warnEmbed(`<@${member.id}> ha sido advertido: ${reason}`)], ephemeral: true });
    const c = await createCase({ type: 'DISCORD_WARN', subjectId: member.id, subjectName: member.user.tag, actorId: interaction.user.id, actorTag: interaction.user.tag, guildId: interaction.guildId, publicReason: reason });
    await addWarn(c.id, member.id, member.user.tag, reason, interaction.user.id);
    await audit({ actorId: interaction.user.id, action: 'discord.warn', targetType: 'discordUser', targetId: member.id, guildId: interaction.guildId, caseId: c.id });
  } catch (err) { await safeError(interaction, err, 'dwarn'); }
}

export async function dkickHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    await requireGuild(interaction);
    const member = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('motivo', true);
    if (!member || typeof member === 'string') throw new Error('Miembro no encontrado.');
    if (!canModerate(interaction.user.id, member.id)) {
      await safeReply(interaction, '⛔ No puedes moderar a un miembro de staff de tu nivel o superior.', true);
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await member.kick(`${reason} — por ${interaction.user.tag}`);
    const c = await createCase({ type: 'DISCORD_KICK', subjectId: member.id, subjectName: member.user.tag, actorId: interaction.user.id, actorTag: interaction.user.tag, guildId: interaction.guildId, publicReason: reason });
    await audit({ actorId: interaction.user.id, action: 'discord.kick', targetType: 'discordUser', targetId: member.id, guildId: interaction.guildId, caseId: c.id });
    await interaction.editReply({ embeds: [successEmbed(`<@${member.id}> expulsado.`)] });
  } catch (err) { await safeError(interaction, err, 'dkick'); }
}

export async function dtimeoutHandler(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (deny(interaction, 'MODERATION_DISCORD')) return;
    await requireGuild(interaction);
    const member = interaction.options.getMember('usuario');
    const minutes = interaction.options.getInteger('minutos', true);
    const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
    if (!member || typeof member === 'string') throw new Error('Miembro no encontrado.');
    if (!canModerate(interaction.user.id, member.id)) {
      await safeReply(interaction, '⛔ No puedes moderar a un miembro de staff de tu nivel o superior.', true);
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await member.timeout(minutes * 60_000, `${reason} — por ${interaction.user.tag}`);
    const c = await createCase({ type: 'DISCORD_TIMEOUT', subjectId: member.id, subjectName: member.user.tag, actorId: interaction.user.id, actorTag: interaction.user.tag, guildId: interaction.guildId, publicReason: reason, durationSec: minutes * 60 });
    await audit({ actorId: interaction.user.id, action: 'discord.timeout', targetType: 'discordUser', targetId: member.id, guildId: interaction.guildId, caseId: c.id });
    await interaction.editReply({ embeds: [successEmbed(`<@${member.id}> en timeout por ${minutes} min.`)] });
  } catch (err) { await safeError(interaction, err, 'dtimeout'); }
}

// ===================== CONFIRMACIÓN (botones) =====================

export async function handleBanConfirm(interaction: import('discord.js').ButtonInteraction, action: PendingAction): Promise<void> {
  const pending = consumePending(action.id);
  if (!pending) {
    await interaction.update({ content: '⚠️ Esta acción ya fue procesada o expiró.', components: [] }).catch(() => {});
    return;
  }
  if (interaction.user.id !== pending.actorId) {
    await interaction.reply({ content: '⛔ Solo quien ejecutó el comando puede confirmarlo.', ephemeral: true });
    return;
  }
  if (!hasPermission(pending.actorId, 'MODERATION_ROBLOX')) {
    await interaction.update({ content: '⛔ Permisos insuficientes.', components: [] });
    return;
  }
  // Re-verificar jerarquía por si el vínculo cambió
  const link = await prisma.playerLink.findUnique({ where: { robloxUserId: pending.userId } });
  if (link && !canModerate(pending.actorId, link.discordUserId)) {
    await interaction.update({ content: '⛔ No puedes sancionar a un miembro de staff de tu nivel o superior.', components: [] });
    return;
  }

  await interaction.update({ content: '⏳ Aplicando sanción en Roblox...', components: [] });

  try {
    requireRoblox();
    let restriction;
    if (pending.type === 'ROBLOX_UNBAN') {
      restriction = await removeUserRestriction(pending.userId);
    } else {
      restriction = await setUserRestriction({
        userId: pending.userId,
        displayReason: pending.publicReason.slice(0, 100),
        privateReason: pending.privateNote?.slice(0, 1000),
        durationSec: pending.durationSec ?? null,
        excludeAltAccounts: pending.propagateAlts ?? false,
        idempotencyKey: pending.caseId ?? `case-${pending.id}`,
      });
    }

    // Actualizar caso
    const caseType = pending.type === 'ROBLOX_BAN' ? 'ROBLOX_BAN' : pending.type === 'ROBLOX_UNBAN' ? 'ROBLOX_UNBAN' : 'ROBLOX_KICK';
    let savedCase;
    if (pending.caseId) {
      savedCase = await prisma.case.update({
        where: { id: pending.caseId },
        data: {
          status: 'ACTIVE',
          robloxRestrictionId: pending.userId,
          subjectName: pending.userName,
        },
      });
    } else {
      savedCase = await createCase({
        type: caseType,
        subjectId: pending.userId,
        subjectName: pending.userName,
        actorId: pending.actorId,
        actorTag: interaction.user.tag,
        guildId: pending.guildId,
        publicReason: pending.publicReason,
        privateNote: pending.privateNote,
        evidence: pending.evidence,
        durationSec: pending.durationSec ?? null,
        robloxRestrictionId: pending.userId,
      });
    }

    await audit({
      actorId: pending.actorId,
      action: pending.type === 'ROBLOX_UNBAN' ? 'roblox.unban' : pending.type === 'ROBLOX_KICK' ? 'roblox.kick' : 'roblox.ban',
      targetType: 'robloxUser',
      targetId: pending.userId,
      guildId: pending.guildId,
      success: true,
      caseId: savedCase.id,
      metadata: { durationSec: pending.durationSec, propagateAlts: pending.propagateAlts },
    });

    const actionLabel = pending.type === 'ROBLOX_UNBAN' ? 'desbaneo' : pending.type === 'ROBLOX_KICK' ? 'expulsión' : 'baneo';
    const resultEmbed = new EmbedBuilder()
      .setColor(pending.type === 'ROBLOX_UNBAN' ? 0x2ecc71 : BRAND.accent)
      .setTitle(`✅ ${actionLabel} aplicado — Roblox`)
      .addFields(
        { name: 'Usuario', value: `**${pending.displayName ?? pending.userName}** (@${pending.userName}) — \`${pending.userId}\`` },
        { name: 'Caso', value: `#${savedCase.caseNumber}`, inline: true },
        { name: 'Duración', value: fmtDuration(pending.durationSec), inline: true },
        { name: 'Moderador', value: `<@${pending.actorId}>`, inline: true },
        { name: 'Respuesta Roblox', value: `\`updateTime: ${restriction?.updateTime ?? 'ok'}\`` },
      )
      .setTimestamp()
      .setFooter({ text: BRAND.footer });

    await interaction.followUp({ embeds: [resultEmbed] }).catch(() => {});

    // Publicar en registro-moderacion
    await postToChannel(interaction.client as unknown as Client, CHANNEL_KEYS.registroModeracion, {
      embeds: [resultEmbed],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    log.error({ err, pending }, 'Falló sanción Roblox');
    await audit({
      actorId: pending.actorId,
      action: 'roblox.moderation.failed',
      targetType: 'robloxUser',
      targetId: pending.userId,
      guildId: pending.guildId,
      success: false,
      error: message,
      caseId: pending.caseId,
    });
    // Marcar caso como fallido/cerrado
    if (pending.caseId) {
      await updateCaseStatus(pending.caseId, 'CLOSED', { privateNote: `Falló: ${message}` }).catch(() => {});
    }
    await interaction.followUp({
      embeds: [errorEmbed(`❌ La sanción falló en Roblox: ${message.slice(0, 500)}`)],
    }).catch(() => {});
  }
}

export async function handleBanCancel(interaction: import('discord.js').ButtonInteraction, action: PendingAction): Promise<void> {
  consumePending(action.id);
  // Cerrar caso pendiente si existe
  if (action.caseId) {
    await updateCaseStatus(action.caseId, 'CLOSED', { privateNote: 'Cancelado por el moderador antes de confirmar.' }).catch(() => {});
  }
  await interaction.update({ content: '🚫 Acción cancelada.', embeds: [], components: [] }).catch(() => {});
}
