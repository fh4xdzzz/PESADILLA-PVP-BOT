import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  EmbedBuilder, MessageFlags, PermissionFlagsBits,
} from "discord.js";

const NEW_TICKET = "pesadilla:ticket:new";
const CLOSE_TICKET = "pesadilla:ticket:close";
const staffPerm = PermissionFlagsBits.ManageGuild;

async function respond(interaction, message) {
  const response = { content: message, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };
  if (interaction.deferred || interaction.replied) return interaction.editReply({ content: message });
  return interaction.reply(response);
}

export async function registerTicketCommand(guild) {
  // Does not wipe other bot commands.
  await guild.commands.create({
    name: "ticket-panel",
    description: "Publicar el panel de tickets de PESADILLA BOT",
    defaultMemberPermissions: staffPerm.toString(),
  });
}

export async function handleTicketInteraction(interaction, settingsSync, sendLog) {
  const isCommand = interaction.isChatInputCommand() && interaction.commandName === "ticket-panel";
  const isButton = interaction.isButton() &&
    [NEW_TICKET, CLOSE_TICKET].includes(interaction.customId);
  if (!isCommand && !isButton) return false;
  if (!interaction.inGuild() || !interaction.guild) {
    await respond(interaction, "Este comando solo funciona dentro de un servidor.");
    return true;
  }
  const cfg = settingsSync.get(interaction.guildId);
  if (!cfg.ticketsEnabled) {
    await respond(interaction, "Los tickets están desactivados en el panel.");
    return true;
  }

  if (isCommand) {
    if (!interaction.memberPermissions?.has(staffPerm)) {
      await respond(interaction, "Necesitas el permiso Gestionar servidor.");
      return true;
    }
    if (!cfg.ticketsChannelId) {
      await respond(interaction, "Configura primero el canal de tickets en el dashboard.");
      return true;
    }
    const channel = await interaction.guild.channels.fetch(cfg.ticketsChannelId).catch(() => null);
    if (!channel || channel.guildId !== interaction.guild.id || channel.type !== ChannelType.GuildText) {
      await respond(interaction, "El canal configurado no existe o no es un canal de texto de este servidor.");
      return true;
    }
    const embed = new EmbedBuilder().setTitle("🎫 Soporte · PESADILLA BOT")
      .setDescription("¿Necesitas ayuda? Pulsa el botón para abrir un ticket privado.")
      .setColor(0xed3a57);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(NEW_TICKET).setLabel("Crear ticket").setStyle(ButtonStyle.Primary),
    );
    await channel.send({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
    await respond(interaction, "Panel de soporte publicado correctamente.");
    return true;
  }

  if (interaction.customId === CLOSE_TICKET) {
    const channel = interaction.channel;
    const topic = channel?.topic;
    const ownerId = typeof topic === "string" && topic.startsWith("pesadilla:ticket:")
      ? topic.slice("pesadilla:ticket:".length) : null;
    if (!ownerId || !/^\d{15,22}$/.test(ownerId)) {
      await respond(interaction, "Este canal no es un ticket de PESADILLA BOT.");
      return true;
    }
    if (interaction.user.id !== ownerId &&
        !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await respond(interaction, "Solo el propietario o un moderador puede cerrar el ticket.");
      return true;
    }
    const logMessage = "Ticket cerrado por " + interaction.user.username + " (" + interaction.user.id + ")";
    await respond(interaction, "Cerrando el ticket. Su contenido se eliminará con el canal.");
    await sendLog(interaction.guild, cfg, logMessage);
    await channel.delete("Ticket cerrado por " + interaction.user.id);
    return true;
  }

  // Defer before API calls to avoid Discord's 3-second response limit.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const tag = "pesadilla:ticket:" + interaction.user.id;
  await interaction.guild.channels.fetch().catch(() => null);
  const existing = interaction.guild.channels.cache.find((c) =>
    c.type === ChannelType.GuildText && c.topic === tag);
  if (existing) {
    await interaction.editReply("Ya tienes un ticket abierto: <#" + existing.id + ">");
    return true;
  }

  const parent = cfg.ticketsChannelId
    ? await interaction.guild.channels.fetch(cfg.ticketsChannelId).catch(() => null) : null;
  if (!parent || parent.guildId !== interaction.guild.id || parent.type !== ChannelType.GuildText) {
    await interaction.editReply("Configura un canal válido de tickets desde el panel.");
    return true;
  }
  const perms = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  const staffRole = cfg.ticketStaffRoleId
    ? await interaction.guild.roles.fetch(cfg.ticketStaffRoleId).catch(() => null) : null;
  if (staffRole && staffRole.guild.id === interaction.guild.id) {
    perms.push({ id: staffRole.id, allow: [
      PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
    ] });
  }
  const channel = await interaction.guild.channels.create({
    name: "ticket-" + interaction.user.username.replace(/[^a-z0-9-]/gi, "").slice(0, 20).toLowerCase()
      + "-" + interaction.user.id.slice(-4),
    type: ChannelType.GuildText,
    parent: parent.parentId ?? undefined,
    topic: tag,
    permissionOverwrites: perms,
    reason: "Ticket de " + interaction.user.id,
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CLOSE_TICKET).setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger),
  );
  await channel.send({
    content: "Ticket de <@" + interaction.user.id + ">. Describe tu problema y un moderador te atenderá.",
    components: [row],
    allowedMentions: { parse: [], users: [interaction.user.id] },
  });
  await interaction.editReply("Tu ticket está listo: <#" + channel.id + ">");
  await sendLog(interaction.guild, cfg, "Ticket abierto por " + interaction.user.id + " en #" + channel.name);
  return true;
}
