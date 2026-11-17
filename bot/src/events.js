import { Events, PermissionFlagsBits, ChannelType } from "discord.js";
import { createSpamGuard, hasLink } from "./moderation.js";
import { renderWelcome } from "./settings.js";
import { handleTicketInteraction, registerTicketCommand } from "./tickets.js";

const spam = createSpamGuard();
const automodDeleted = new Map();

async function getChannel(guild, channelId) {
  if (!channelId) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  return channel?.guildId === guild.id && channel.type === ChannelType.GuildText ? channel : null;
}

export async function sendLog(guild, settings, content) {
  if (!settings.logsEnabled || !settings.logsChannelId) return;
  const channel = await getChannel(guild, settings.logsChannelId);
  if (!channel) return;
  await channel.send({ content: String(content).slice(0, 1800), allowedMentions: { parse: [] } });
}

export function registerBotEvents(client, settingsSync) {
  client.on(Events.GuildCreate, async (guild) => {
    await settingsSync.refresh(guild.id);
    try { await registerTicketCommand(guild); }
    catch (error) { console.warn("[commands] register failed for guild " + guild.id, error.message); }
  });
  client.on(Events.GuildDelete, (guild) => settingsSync.forget(guild.id));

  client.on(Events.GuildMemberAdd, async (member) => {
    const cfg = settingsSync.get(member.guild.id);
    try {
      if (cfg.welcomeEnabled && cfg.welcomeChannelId) {
        const channel = await getChannel(member.guild, cfg.welcomeChannelId);
        if (channel) await channel.send({
          content: renderWelcome(cfg.welcomeMessage, member.id, member.guild.name),
          allowedMentions: { parse: [], users: [member.id] },
        });
      }
      await sendLog(member.guild, cfg, "📥 Entrada: " + member.user.username + " (" + member.id + ")");
    } catch (error) { console.warn("[welcome] " + error.message); }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      await sendLog(member.guild, settingsSync.get(member.guild.id),
        "📤 Salida: " + (member.user?.username ?? member.id) + " (" + member.id + ")");
    } catch (error) { console.warn("[leave] " + error.message); }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot || !message.member) return;
    const cfg = settingsSync.get(message.guild.id);
    if (!cfg.autoModEnabled) return;
    if (message.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
        message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
    const link = cfg.antiLinksEnabled && hasLink(message.content ?? "");
    const excessive = cfg.antiSpamEnabled && spam.exceeds(message.guild.id, message.author.id);
    if (!link && !excessive) return;
    if (!message.deletable) return;
    try {
      automodDeleted.set(message.id, Date.now());
      await message.delete();
      await sendLog(message.guild, cfg,
        "🛡 Mensaje eliminado por " + (link ? "enlace no permitido" : "antispam") +
        " · usuario " + message.author.id + " · canal " + message.channelId);
    } catch (error) { console.warn("[moderation] " + error.message); }
  });

  client.on(Events.MessageDelete, async (message) => {
    if (!message.guild) return;
    if (automodDeleted.has(message.id)) {
      automodDeleted.delete(message.id);
      return;
    }
    const cfg = settingsSync.get(message.guild.id);
    try {
      await sendLog(message.guild, cfg, "🗑 Mensaje eliminado · canal " + message.channelId +
        (message.author ? " · autor " + message.author.id : ""));
    } catch (error) { console.warn("[logs] " + error.message); }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      await handleTicketInteraction(interaction, settingsSync, sendLog);
    } catch (error) {
      console.error("[tickets] " + (error instanceof Error ? error.message : "error"));
      if (interaction.isRepliable()) {
        const payload = { content: "No se pudo completar la operación. Comprueba los permisos del bot.", ephemeral: true };
        try {
          if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
          else await interaction.reply(payload);
        } catch { /* interaction expired */ }
      }
    }
  });

  const cleanup = setInterval(() => {
    spam.cleanup();
    const limit = Date.now() - 60_000;
    for (const [id, stamp] of automodDeleted) {
      if (stamp < limit) automodDeleted.delete(id);
    }
  }, 60_000);
  cleanup.unref();
}

export async function initializeCommands(client) {
  const guilds = [...client.guilds.cache.values()];
  for (const guild of guilds) {
    try { await registerTicketCommand(guild); }
    catch (error) { console.warn("[commands] " + guild.id + ": " + error.message); }
  }
}
