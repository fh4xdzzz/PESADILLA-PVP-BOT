const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');
const { config } = require('../config.js');
const { prisma } = require('../db.js');
const { audit } = require('../core/audit.js');
const { hasPermission, PERMISSIONS } = require('../core/permissions.js');
const { safeReply, safeError } = require('../core/errors.js');
const { BRAND, successEmbed, errorEmbed } = require('../core/embeds.js');
const { getSetting, setSetting, postToChannel, CHANNEL_KEYS } = require('../services/settings.js');
const {
  createGiveaway, getGiveaway, enterGiveaway, giveawayEntryCount,
  pickWinners, endGiveaway,
} = require('../services/engagement.js');
const {
  createTournament, getActiveTournament, registerParticipant,
} = require('../services/engagement.js');
const {
  createTicket, getTicketByChannel, claimTicket, closeTicket,
} = require('../services/tickets.js');
const { CUSTOM_IDS } = require('../discord/customIds.js');

function deny(interaction, perm) {
  if (!hasPermission(interaction.user.id, perm)) {
    safeReply(interaction, '⛔ No tienes permisos para este comando.', true);
    return true;
  }
  return false;
}

const TICKET_CATEGORIES = [
  { label: 'Reportar jugador', value: 'report_player', emoji: '🚨' },
  { label: 'Apelar baneo', value: 'appeal_ban', emoji: '⚖️' },
  { label: 'Problema técnico', value: 'technical', emoji: '🛠️' },
  { label: 'Recuperar recompensa', value: 'reward_claim', emoji: '🎁' },
  { label: 'Pregunta general', value: 'general', emoji: '❓' },
  { label: 'Contactar administración', value: 'contact_admin', emoji: '📨' },
];

async function announceHandler(interaction) {
  try {
    if (deny(interaction, 'ANNOUNCEMENTS')) return;
    const msg = interaction.options.getString('mensaje', true);
    const channel = interaction.options.getChannel('canal');
    await interaction.deferReply({ ephemeral: true });

    const target = channel ?? (await getSetting(CHANNEL_KEYS.anuncios)
      ? await interaction.client.channels.fetch(await getSetting(CHANNEL_KEYS.anuncios))
      : interaction.channel);
    if (!target?.isTextBased?.()) throw new Error('Canal inválido.');

    const embed = new EmbedBuilder()
      .setColor(BRAND.accent)
      .setTitle('📢 Anuncio oficial')
      .setDescription(msg)
      .setFooter({ text: `${BRAND.footer} • por ${interaction.user.tag}` })
      .setTimestamp();
    await target.send({ embeds: [embed] });
    await audit({ actorId: interaction.user.id, action: 'announce', guildId: interaction.guildId });
    await interaction.editReply({ embeds: [successEmbed('Anuncio publicado.')] });
  } catch (err) { await safeError(interaction, err, 'announce'); }
}

async function gameHandler(interaction) {
  try {
    const link = await getSetting('config.game-link');
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('🎮 PESADILLA PVP')
        .setDescription(link ? `Juega aquí: ${link}` : 'Enlace oficial próximamente.')
        .setFooter({ text: BRAND.footer })],
      ephemeral: false,
    });
  } catch (err) { await safeError(interaction, err, 'game'); }
}

async function statusHandler(interaction) {
  try {
    const text = await getSetting('config.status-text');
    const link = await getSetting('config.game-link');
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('🟢 Estado del servidor')
        .setDescription(text ?? '✅ Todos los sistemas operativos.')
        .addFields(link ? [{ name: 'Jugar', value: link }] : [])
        .setFooter({ text: BRAND.footer }).setTimestamp()],
      ephemeral: false,
    });
  } catch (err) { await safeError(interaction, err, 'status'); }
}

async function updateHandler(interaction) {
  try {
    if (deny(interaction, 'ANNOUNCEMENTS')) return;
    const title = interaction.options.getString('titulo', true);
    const desc = interaction.options.getString('descripcion', true);
    await interaction.deferReply({ ephemeral: true });
    await postToChannel(interaction.client, CHANNEL_KEYS.updates, {
      embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle(`🆕 ${title}`).setDescription(desc)
        .setFooter({ text: `${BRAND.footer} • ${interaction.user.tag}` }).setTimestamp()],
    });
    await interaction.editReply({ embeds: [successEmbed('Update publicado.')] });
  } catch (err) { await safeError(interaction, err, 'update'); }
}

async function sneakpeekHandler(interaction) {
  try {
    if (deny(interaction, 'ANNOUNCEMENTS')) return;
    const msg = interaction.options.getString('mensaje', true);
    await interaction.deferReply({ ephemeral: true });
    await postToChannel(interaction.client, CHANNEL_KEYS.sneakPeek, {
      embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('🔍 Sneak Peek').setDescription(msg)
        .setFooter({ text: BRAND.footer }).setTimestamp()],
    });
    await interaction.editReply({ embeds: [successEmbed('Sneak peek publicado.')] });
  } catch (err) { await safeError(interaction, err, 'sneakpeek'); }
}

async function codesHandler(interaction) {
  try {
    await interaction.deferReply({ ephemeral: false });
    const codes = await prisma.gameCode.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' }, take: 20 });
    const now = new Date();
    const valid = codes.filter((c) => !c.expiresAt || c.expiresAt > now);
    const embed = new EmbedBuilder().setColor(BRAND.color).setTitle('🎟️ Códigos activos').setFooter({ text: BRAND.footer });
    embed.setDescription(
      valid.length
        ? valid.map((c) => `• \`${c.code}\` — ${c.description ?? 'Recompensa en el juego'}${c.maxUses ? ` (${c.uses}/${c.maxUses} usados)` : ''}`).join('\n')
        : 'No hay códigos activos por ahora. ¡Atento a anuncios!',
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (err) { await safeError(interaction, err, 'codes'); }
}

async function codecreateHandler(interaction) {
  try {
    if (deny(interaction, 'CODES')) return;
    const code = interaction.options.getString('codigo', true).toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error('Código inválido (3-32 chars: A-Z, 0-9, _ -).');
    const description = interaction.options.getString('descripcion');
    const maxUses = interaction.options.getInteger('maxusos');
    const days = interaction.options.getInteger('dias');
    await interaction.deferReply({ ephemeral: true });

    await prisma.gameCode.create({
      data: {
        code, description: description ?? null, maxUses: maxUses ?? null,
        expiresAt: days ? new Date(Date.now() + days * 86400_000) : null,
        createdBy: interaction.user.id,
      },
    });
    await postToChannel(interaction.client, CHANNEL_KEYS.codes, {
      content: `🎟️ **Nuevo código:** \`${code}\`${description ? ` — ${description}` : ''}`,
    });
    await audit({ actorId: interaction.user.id, action: 'code.create', targetId: code, guildId: interaction.guildId });
    await interaction.editReply({ embeds: [successEmbed(`Código \`${code}\` creado.`)] });
  } catch (err) { await safeError(interaction, err, 'codecreate'); }
}

async function codedeleteHandler(interaction) {
  try {
    if (deny(interaction, 'CODES')) return;
    const code = interaction.options.getString('codigo', true).toUpperCase();
    await interaction.deferReply({ ephemeral: true });
    const res = await prisma.gameCode.updateMany({ where: { code }, data: { active: false } });
    if (res.count === 0) { await interaction.editReply({ content: `Código \`${code}\` no encontrado.` }); return; }
    await audit({ actorId: interaction.user.id, action: 'code.delete', targetId: code, guildId: interaction.guildId });
    await interaction.editReply({ embeds: [successEmbed(`Código \`${code}\` desactivado.`)] });
  } catch (err) { await safeError(interaction, err, 'codedelete'); }
}

async function dailyshopHandler(interaction) {
  try {
    if (deny(interaction, 'EVENTS')) return;
    const items = interaction.options.getString('items', true);
    await interaction.deferReply({ ephemeral: true });
    await postToChannel(interaction.client, CHANNEL_KEYS.dailyShop, {
      embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('🛒 Tienda diaria')
        .setDescription(items).setFooter({ text: `${BRAND.footer} • ${interaction.user.tag}` }).setTimestamp()],
    });
    await interaction.editReply({ embeds: [successEmbed('Tienda publicada.')] });
  } catch (err) { await safeError(interaction, err, 'dailyshop'); }
}

async function eventHandler(interaction) {
  try {
    if (deny(interaction, 'EVENTS')) return;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });
    if (sub === 'create') {
      const title = interaction.options.getString('titulo', true);
      const fecha = interaction.options.getString('fecha', true);
      const desc = interaction.options.getString('descripcion') ?? '';
      await setSetting(`event.${Date.now()}`, JSON.stringify({ title, fecha, desc, by: interaction.user.id }));
      await postToChannel(interaction.client, CHANNEL_KEYS.events, {
        embeds: [new EmbedBuilder().setColor(BRAND.accent).setTitle(`🎉 Evento: ${title}`)
          .setDescription(`${desc}\n\n📅 **Fecha:** ${fecha}`).setFooter({ text: BRAND.footer }).setTimestamp()],
      });
      await interaction.editReply({ embeds: [successEmbed('Evento publicado.')] });
    } else {
      const events = await prisma.botSetting.findMany({ where: { key: { startsWith: 'event.' } } });
      const list = events.map((e) => { try { return JSON.parse(e.value); } catch { return null; } }).filter(Boolean);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('📅 Eventos')
          .setDescription(list.length ? list.map((e) => `• **${e.title}** — ${e.fecha}`).join('\n') : 'No hay eventos programados.')
          .setFooter({ text: BRAND.footer })],
      });
    }
  } catch (err) { await safeError(interaction, err, 'event'); }
}

async function pollHandler(interaction) {
  try {
    if (deny(interaction, 'EVENTS')) return;
    const question = interaction.options.getString('pregunta', true);
    const options = interaction.options.getString('opciones', true).split('|').map((s) => s.trim()).filter(Boolean).slice(0, 5);
    if (options.length < 2) throw new Error('Se necesitan al menos 2 opciones separadas por |');
    await interaction.deferReply({ ephemeral: true });

    const pollId = Math.random().toString(36).slice(2, 8);
    await setSetting(`poll.${pollId}`, JSON.stringify({ question, options, votes: {}, endsAt: null }));

    const row = new ActionRowBuilder().addComponents(
      ...options.map((opt, i) => new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.pollVote(pollId, i))
        .setLabel(opt.slice(0, 80))
        .setStyle(ButtonStyle.Primary)),
    );

    const channel = interaction.options.getChannel('canal') ?? interaction.channel;
    if (!channel?.isTextBased?.()) throw new Error('Canal inválido.');
    await channel.send({
      embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle(`📊 ${question}`).setFooter({ text: `Encuesta por ${interaction.user.tag} • ${BRAND.footer}` })],
      components: [row],
    });
    await interaction.editReply({ embeds: [successEmbed('Encuesta publicada.')] });
  } catch (err) { await safeError(interaction, err, 'poll'); }
}

async function giveawayHandler(interaction) {
  try {
    if (deny(interaction, 'GIVEAWAYS')) return;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'create') {
      const prize = interaction.options.getString('premio', true);
      const mins = interaction.options.getInteger('duracion_min', true);
      const winners = interaction.options.getInteger('ganadores') ?? 1;
      const channel = interaction.options.getChannel('canal') ?? interaction.channel;
      if (!channel?.isTextBased?.()) throw new Error('Canal inválido para sorteo.');

      const g = await createGiveaway({
        guildId: interaction.guildId, channelId: channel.id, prize,
        winnersCount: winners, hostId: interaction.user.id,
        endsAt: new Date(Date.now() + mins * 60_000),
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.giveawayEnter(g.id)).setLabel('🎉 Participar').setStyle(ButtonStyle.Success),
      );
      const embed = new EmbedBuilder().setColor(BRAND.accent).setTitle('🎉 Sorteo')
        .setDescription(`**Premio:** ${prize}\n**Ganadores:** ${winners}\n**Termina:** <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>`)
        .setFooter({ text: `ID: ${g.id} • ${BRAND.footer}` });
      const msg = await channel.send({ embeds: [embed], components: [row] });
      await prisma.giveaway.update({ where: { id: g.id }, data: { messageId: msg.id } });
      await interaction.editReply({ embeds: [successEmbed(`Sorteo creado (ID: \`${g.id.slice(-8)}\`).`)] });
      return;
    }

    const idInput = interaction.options.getString('id', true);
    const g = await prisma.giveaway.findFirst({ where: { id: { endsWith: idInput }, guildId: interaction.guildId } });
    if (!g) { await interaction.editReply({ content: 'Sorteo no encontrado.' }); return; }

    if (sub === 'end') {
      const winners = await pickWinners(g.id, g.winnersCount);
      await endGiveaway(g.id, winners);
      await interaction.editReply({ content: `🏁 Sorteo finalizado. Ganadores: ${winners.map((w) => `<@${w}>`).join(', ') || 'ninguno'}` });
      return;
    }
    const winners = await pickWinners(g.id, g.winnersCount);
    await prisma.giveaway.update({ where: { id: g.id }, data: { winners: JSON.parse(JSON.stringify(winners)) } });
    await interaction.editReply({ content: `🔄 Nuevo sorteo: ${winners.map((w) => `<@${w}>`).join(', ') || 'ninguno'}` });
  } catch (err) { await safeError(interaction, err, 'giveaway'); }
}

async function tournamentHandler(interaction) {
  try {
    if (deny(interaction, 'EVENTS')) return;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'create') {
      const name = interaction.options.getString('nombre', true);
      const max = interaction.options.getInteger('maxjugadores') ?? 8;
      const existing = await getActiveTournament(interaction.guildId);
      if (existing) { await interaction.editReply({ content: `Ya hay un torneo activo: **${existing.name}**` }); return; }
      const t = await createTournament({ guildId: interaction.guildId, name, maxPlayers: max, createdBy: interaction.user.id });
      await interaction.editReply({ embeds: [successEmbed(`Torneo **${name}** creado (ID: \`${t.id.slice(-8)}\`). Los jugadores pueden apuntarse con \`/tournament register\`.`)] });
      return;
    }

    if (sub === 'register') {
      const t = await getActiveTournament(interaction.guildId);
      if (!t) { await interaction.editReply({ content: 'No hay torneo activo en registro.' }); return; }
      const ign = interaction.options.getString('ign');
      const link = await prisma.playerLink.findUnique({ where: { discordUserId: interaction.user.id } });
      await registerParticipant(t.id, {
        discordUserId: interaction.user.id,
        robloxUserId: link?.robloxUserId ?? undefined,
        ign: ign ?? link?.robloxName ?? undefined,
      });
      await interaction.editReply({ content: `✅ Inscrito en **${t.name}**. Participantes: ${t.participants.length + 1}/${t.maxPlayers}` });
      return;
    }

    if (sub === 'list') {
      const t = await getActiveTournament(interaction.guildId);
      if (!t) { await interaction.editReply({ content: 'No hay torneo activo.' }); return; }
      const names = t.participants.map((p) => p.ign ?? p.discordUserId ?? p.robloxUserId).join(', ') || 'ninguno';
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle(`🏆 ${t.name}`)
          .setDescription(`Estado: ${t.status}\nParticipantes (${t.participants.length}/${t.maxPlayers}):\n${names}`)
          .setFooter({ text: BRAND.footer })],
      });
      return;
    }

    const user = interaction.options.getUser('usuario', true);
    const placement = interaction.options.getInteger('colocacion', true);
    const t = await prisma.tournament.findFirst({
      where: { guildId: interaction.guildId, status: { in: ['REGISTRATION', 'IN_PROGRESS'] } },
      include: { participants: true },
    });
    if (!t) { await interaction.editReply({ content: 'No hay torneo activo.' }); return; }
    const p = t.participants.find((x) => x.discordUserId === user.id);
    if (!p) { await interaction.editReply({ content: 'Ese usuario no está inscrito.' }); return; }
    await prisma.tournamentParticipant.update({ where: { id: p.id }, data: { placement, eliminated: placement > 1 } });
    if (placement === 1) {
      await prisma.tournament.update({ where: { id: t.id }, data: { status: 'FINISHED', endedAt: new Date() } });
    }
    await interaction.editReply({ content: `🏅 <@${user.id}> registrado en posición #${placement}.` });
  } catch (err) { await safeError(interaction, err, 'tournament'); }
}

async function configHandler(interaction) {
  try {
    if (!hasPermission(interaction.user.id, 'CONFIG')) {
      await safeReply(interaction, '⛔ Solo ADMIN/OWNER pueden configurar el bot.', true);
      return;
    }
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'set') {
      const key = interaction.options.getString('clave', true);
      const value = interaction.options.getString('valor', true);
      await setSetting(key, value, interaction.user.id);
      await interaction.editReply({ embeds: [successEmbed(`\`${key}\` = \`${value}\``)] });
      return;
    }

    const settings = await prisma.botSetting.findMany();
    const lines = settings.map((s) => `\`${s.key}\` = \`${s.value}\``).join('\n') || 'Sin ajustes.';
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle('⚙️ Configuración').setDescription(lines.slice(0, 4000)).setFooter({ text: BRAND.footer })],
    });
  } catch (err) { await safeError(interaction, err, 'config'); }
}

async function ticketPanelHandler(interaction) {
  try {
    if (deny(interaction, 'TICKETS')) return;
    const channel = interaction.options.getChannel('canal') ?? interaction.channel;
    if (!channel?.isTextBased?.()) throw new Error('Canal inválido.');

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('🎫 Centro de soporte — PESADILLA PVP')
      .setDescription('¿Necesitas ayuda? Abre un ticket seleccionando una categoría.\nEl staff te atenderá lo antes posible.')
      .setFooter({ text: BRAND.footer });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.ticketOpen).setLabel('Abrir ticket').setStyle(ButtonStyle.Primary),
    );
    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Panel de tickets publicado.', ephemeral: true });
  } catch (err) { await safeError(interaction, err, 'ticket panel'); }
}

async function ticketCloseHandler(interaction) {
  try {
    if (deny(interaction, 'TICKETS')) return;
    const channel = interaction.options.getChannel('canal', true);
    const ticket = await getTicketByChannel(channel.id);
    if (!ticket) { await safeReply(interaction, 'No hay ticket abierto en ese canal.', true); return; }
    await closeTicket(ticket.id, interaction.user.id);
    await audit({ actorId: interaction.user.id, action: 'ticket.close', targetType: 'ticket', targetId: ticket.id, guildId: interaction.guildId });
    await safeReply(interaction, `Ticket #${ticket.id.slice(-6)} cerrado.`, true);
  } catch (err) { await safeError(interaction, err, 'ticket close'); }
}

async function ticketClaimHandler(interaction) {
  try {
    if (deny(interaction, 'TICKETS')) return;
    const channel = interaction.options.getChannel('canal', true);
    const ticket = await getTicketByChannel(channel.id);
    if (!ticket) { await safeReply(interaction, 'No hay ticket abierto en ese canal.', true); return; }
    await claimTicket(ticket.id, interaction.user.id);
    await audit({ actorId: interaction.user.id, action: 'ticket.claim', targetType: 'ticket', targetId: ticket.id, guildId: interaction.guildId });
    await safeReply(interaction, `Ticket reclamado por <@${interaction.user.id}>.`, true);
  } catch (err) { await safeError(interaction, err, 'ticket claim'); }
}

async function openTicketChannel(interaction, category) {
  const guild = interaction.guild;
  if (!guild) return;
  const user = interaction.user;

  const { userOpenTickets } = require('../services/tickets.js');
  const open = await userOpenTickets(user.id, guild.id);
  if (open.length >= 1) {
    await interaction.reply({ content: 'Ya tienes un ticket abierto. Espera a que sea atendido o cerrado.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const catLabel = TICKET_CATEGORIES.find((c) => c.value === category)?.label ?? category;
  const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;

  const everyoneRole = guild.roles.everyone;
  const staffRoles = [
    ...config.staff.OWNER, ...config.staff.ADMIN, ...config.staff.HEAD_MOD,
    ...config.staff.MOD, ...config.staff.SUPPORT_STAFF,
  ];

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...staffRoles.map((rid) => ({
        id: rid,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
      })),
      { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
    ],
    topic: `Ticket ${category} — ${user.tag}`,
  });

  const ticket = await createTicket({
    guildId: guild.id, ownerId: user.id, category,
    subject: `${catLabel} — abierto por ${user.tag}`, channelId: channel.id,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.ticketClaim(ticket.id)).setLabel('Reclamar').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.ticketClose(ticket.id)).setLabel('Cerrar').setStyle(ButtonStyle.Danger),
  );

  await channel.send({
    content: `<@${user.id}>`,
    embeds: [new EmbedBuilder().setColor(BRAND.color).setTitle(`🎫 Ticket #${ticket.id.slice(-6).toUpperCase()}`)
      .addFields(
        { name: 'Categoría', value: catLabel },
        { name: 'Abierto por', value: `<@${user.id}>` },
        { name: 'Estado', value: 'Abierto — esperando staff' },
      ).setFooter({ text: BRAND.footer }).setTimestamp()],
    components: [row],
  });

  await interaction.editReply({ content: `Tu ticket fue creado: <#${channel.id}>` });
}

function ticketCategorySelectRow() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket:select-category')
    .setPlaceholder('Selecciona la categoría de tu problema')
    .addOptions(TICKET_CATEGORIES.map((c) => ({ label: c.label, value: c.value, emoji: c.emoji })));
  return new ActionRowBuilder().addComponents(select);
}

module.exports = {
  announceHandler, gameHandler, statusHandler, updateHandler, sneakpeekHandler,
  codesHandler, codecreateHandler, codedeleteHandler, dailyshopHandler,
  eventHandler, pollHandler, giveawayHandler, tournamentHandler,
  configHandler, ticketPanelHandler, ticketCloseHandler, ticketClaimHandler,
  openTicketChannel, ticketCategorySelectRow,
};
